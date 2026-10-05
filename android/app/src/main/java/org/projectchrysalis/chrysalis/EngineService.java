package org.projectchrysalis.chrysalis;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Runs the compiled Chrysalis server as a child process and keeps this app
 * in the foreground while it runs, so Android does not reclaim it while the
 * person is in the browser.
 *
 * The server learns everything from its environment: where its home and
 * resources are, a setup token for the first account, and a status file it
 * writes with its own address. Closing its stdin asks it to shut down
 * cleanly, and it also exits by itself if this process dies.
 */
public final class EngineService extends Service {
    enum Phase { STOPPED, UNPACKING, STARTING, RUNNING, FAILED }

    /** What the launcher shows. Read and written on the main thread only. */
    static final class State {
        Phase phase = Phase.STOPPED;
        int percent;
        String url;
        String error;
    }

    interface Listener {
        void onState(State state);
    }

    static final String ACTION_START = "org.projectchrysalis.chrysalis.START";
    static final String ACTION_STOP = "org.projectchrysalis.chrysalis.STOP";
    private static final String CHANNEL = "server";
    private static final int NOTIFICATION_ID = 1;

    private static final State state = new State();
    private static final List<Listener> listeners = new ArrayList<>();
    private static final Handler main = new Handler(Looper.getMainLooper());

    private static final String TAG = "MolfarVertep";
    private static final int READY_TIMEOUT_SECONDS = 90;
    private static final Object logLock = new Object();

    private Process process;
    private volatile boolean stopping;
    /** Set by fail(), read by onDestroy: the service going away after a failure
     *  must not replace the failure on screen with "Stopped". (The static
     *  state cannot say this: it is updated on the main thread, later.) */
    private volatile boolean failed;
    private Thread worker;

    static State state() {
        return state;
    }

    static void addListener(Listener l) {
        listeners.add(l);
        l.onState(state);
    }

    static void removeListener(Listener l) {
        listeners.remove(l);
    }

    private static void publish(Phase phase, int percent, String url, String error) {
        main.post(() -> {
            state.phase = phase;
            state.percent = percent;
            state.url = url;
            state.error = error;
            for (Listener l : new ArrayList<>(listeners)) l.onState(state);
        });
    }

    static File homeDir(Context context) {
        return new File(context.getFilesDir(), "home");
    }

    static File statusFile(Context context) {
        return new File(context.getFilesDir(), "engine-status.json");
    }

    /** The server's own output for this run (the engine also keeps a log in its data folder). */
    static File outputFile(Context context) {
        return new File(context.getFilesDir(), "engine-output.log");
    }

    /** What the launcher itself did on the last Start: one line per phase and
     *  every failure. Shown first in the Logs dialog. */
    static File launcherLogFile(Context context) {
        return new File(context.getFilesDir(), "launcher.log");
    }

    private static void resetLauncherLog(Context context) {
        synchronized (logLock) {
            try (FileOutputStream out = new FileOutputStream(launcherLogFile(context), false)) {
                out.flush();
            } catch (Throwable ignored) {
                // the log is a convenience, never a reason to fail
            }
        }
    }

    /** One timestamped line in launcher.log and in logcat. Never throws. */
    private static void launcherLog(Context context, boolean error, String message) {
        try {
            if (error) Log.e(TAG, message);
            else Log.i(TAG, message);
        } catch (Throwable ignored) {
            // logcat unavailable
        }
        synchronized (logLock) {
            try (FileOutputStream out = new FileOutputStream(launcherLogFile(context), true)) {
                String stamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(new Date());
                String line = stamp + (error ? " ERROR " : " ") + message + "\n";
                out.write(line.getBytes(StandardCharsets.UTF_8));
            } catch (Throwable ignored) {
                // the log is a convenience, never a reason to fail
            }
        }
    }

    /** Show a failure on the launcher screen (for failures that happen in the activity). */
    static void reportFailure(String message) {
        publish(Phase.FAILED, 0, null, message);
    }

    /** A token that lets the first visitor create the admin account. Kept for
     *  the life of the install, so the Open button can always build the link. */
    static String setupToken(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("launcher", MODE_PRIVATE);
        String token = prefs.getString("setup_token", null);
        if (token == null) {
            byte[] bytes = new byte[18];
            new SecureRandom().nextBytes(bytes);
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            token = sb.toString();
            prefs.edit().putString("setup_token", token).apply();
        }
        return token;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopEngine();
            return START_NOT_STICKY;
        }
        goForeground(getString(R.string.notification_starting));
        if (worker == null || !worker.isAlive()) {
            stopping = false;
            failed = false;
            worker = new Thread(this::run, "chrysalis-engine");
            worker.start();
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        // after a failure the error stays on screen; any other end (a system
        // kill, say) reads as stopped
        killProcess();
        if (!failed) publish(Phase.STOPPED, 0, null, null);
        super.onDestroy();
    }

    private void run() {
        try {
            resetLauncherLog(this);
            launcherLog(this, false, "Start: " + BuildConfig.VERSION_NAME + ", Android API " + Build.VERSION.SDK_INT
                + " (" + Build.VERSION.RELEASE + "), ABIs " + Arrays.toString(Build.SUPPORTED_ABIS));
            publish(Phase.UNPACKING, 0, null, null);
            Payload.ensure(this, percent -> publish(Phase.UNPACKING, percent, null, null));
            launcherLog(this, false, "Resources ready in " + Payload.resourcesDir(this));
            publish(Phase.STARTING, 0, null, null);
            launch();
        } catch (Throwable e) {
            if (!stopping) fail(e.getMessage() == null ? e.toString() : e.getMessage());
        }
    }

    private void launch() throws IOException, InterruptedException {
        File home = homeDir(this);
        File tmp = new File(getCacheDir(), "tmp");
        home.mkdirs();
        tmp.mkdirs();
        File status = statusFile(this);
        //noinspection ResultOfMethodCallIgnored
        status.delete();

        File binary = new File(getApplicationInfo().nativeLibraryDir, "libchrysalis.so");
        launcherLog(this, false, "Engine binary " + binary.getAbsolutePath() + ": exists=" + binary.exists()
            + ", canExecute=" + binary.canExecute() + ", length=" + binary.length());
        ProcessBuilder pb = new ProcessBuilder(binary.getAbsolutePath());
        pb.directory(home);
        pb.redirectErrorStream(true);
        Map<String, String> env = pb.environment();
        env.put("HOME", getFilesDir().getAbsolutePath());
        env.put("TMPDIR", tmp.getAbsolutePath());
        env.put("CHRYSALIS_HOME", home.getAbsolutePath());
        env.put("CHRYSALIS_RESOURCES", Payload.resourcesDir(this).getAbsolutePath());
        env.put("CHRYSALIS_STATUS_FILE", status.getAbsolutePath());
        env.put("CHRYSALIS_SETUP_TOKEN", setupToken(this));
        env.put("CHRYSALIS_OPEN_BROWSER", "false");
        env.put("CHRYSALIS_EXIT_ON_STDIN_CLOSE", "1");
        process = pb.start();
        Process proc = process;
        launcherLog(this, false, "Engine process started");

        Thread pump = new Thread(() -> copyOutput(proc.getInputStream()), "chrysalis-output");
        pump.start();

        String url = waitForReady(proc, status);
        if (url == null) {
            if (stopping) return;
            if (proc.isAlive()) {
                String timeout = "The engine did not become ready in " + READY_TIMEOUT_SECONDS + " seconds";
                launcherLog(this, true, timeout);
                proc.destroy();
                proc.waitFor(3, TimeUnit.SECONDS);
                pump.join(1000);
                fail(outputOr(timeout + ". See Logs."));
                return;
            }
            pump.join(1000);
            String exit = describeExit(proc.exitValue());
            launcherLog(this, true, "The engine stopped at start: " + exit);
            fail(outputOr("The engine stopped at start with " + exit + ". See Logs."));
            return;
        }
        launcherLog(this, false, "Engine ready at " + url);
        publish(Phase.RUNNING, 100, url, null);
        goForeground(getString(R.string.notification_running));

        int code = proc.waitFor();
        pump.join(1000);
        if (stopping) return;
        launcherLog(this, code != 0, "Engine process exited: " + describeExit(code));
        if (code == 0) stopEngine();
        else fail(outputOr("The engine stopped with " + describeExit(code) + ". See Logs."));
    }

    /** "exit code 159 (killed by signal 31)": Java reports a signal death as 128 plus the signal. */
    private static String describeExit(int code) {
        return "exit code " + code + (code > 128 ? " (killed by signal " + (code - 128) + ")" : "");
    }

    /** The end of the engine's output, or the given message when it said nothing. */
    private String outputOr(String fallback) {
        String output = lastLines(outputFile(this), 12);
        return output.isEmpty() ? fallback : output;
    }

    /** Wait for the server's status file and a health check that names the
     *  same instance: a stale file or another program on the port never
     *  counts as ready. Returns null if the process exits first (the caller
     *  tells that from a timeout with isAlive) or never becomes healthy. */
    private String waitForReady(Process proc, File status) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(READY_TIMEOUT_SECONDS);
        while (System.nanoTime() < deadline && !stopping) {
            if (!proc.isAlive()) return null;
            try {
                if (status.isFile()) {
                    JSONObject lock = new JSONObject(readFile(status));
                    String url = lock.getString("url");
                    JSONObject health = Http.getJson(url + "/v1/health", 2000);
                    if (lock.getString("instance").equals(health.optString("instance"))) return url;
                }
            } catch (Exception ignored) {
                // not up yet
            }
            Thread.sleep(400);
        }
        return null;
    }

    /** The URL the server currently answers on (Settings can move it). */
    static String currentUrl(Context context) {
        try {
            return new JSONObject(readFile(statusFile(context))).getString("url");
        } catch (Exception e) {
            return state.url;
        }
    }

    private void copyOutput(InputStream in) {
        try (OutputStream out = new FileOutputStream(outputFile(this), false)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                out.flush();
            }
        } catch (IOException ignored) {
            // the process closed its output
        }
    }

    private void fail(String message) {
        failed = true;
        launcherLog(this, true, "Failed: " + message);
        publish(Phase.FAILED, 0, null, message);
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    /** Ask the engine to shut down: closing its stdin is a clean stop, then
     *  the process is destroyed if it lingers. */
    private void killProcess() {
        stopping = true;
        Process proc = process;
        process = null;
        if (proc != null) {
            new Thread(() -> {
                try {
                    // closing stdin asks for a clean shutdown
                    proc.getOutputStream().close();
                    if (!proc.waitFor(8, TimeUnit.SECONDS)) {
                        proc.destroy();
                        if (!proc.waitFor(3, TimeUnit.SECONDS)) proc.destroyForcibly();
                    }
                } catch (Exception ignored) {
                    proc.destroyForcibly();
                }
            }, "chrysalis-stop").start();
        }
    }

    /** A requested stop, or a clean exit of the engine. */
    private void stopEngine() {
        killProcess();
        publish(Phase.STOPPED, 0, null, null);
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private void goForeground(String title) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, getString(R.string.notification_channel), NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, EngineService.class).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(getString(R.string.notification_tap))
                .setContentIntent(open)
                .setOngoing(true)
                .addAction(new Notification.Action.Builder(null, getString(R.string.action_stop), stop).build())
                .build();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, n);
        }
    }

    static String readFile(File file) throws IOException {
        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            byte[] bytes = new byte[(int) raf.length()];
            raf.readFully(bytes);
            return new String(bytes, StandardCharsets.UTF_8);
        }
    }

    /** The end of a log file, for an error message or the clipboard. */
    static String lastLines(File file, int lines) {
        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            long len = raf.length();
            long start = Math.max(0, len - 64 * 1024);
            byte[] bytes = new byte[(int) (len - start)];
            raf.seek(start);
            raf.readFully(bytes);
            String[] all = new String(bytes, StandardCharsets.UTF_8).split("\n");
            StringBuilder sb = new StringBuilder();
            for (int i = Math.max(0, all.length - lines); i < all.length; i++) sb.append(all[i]).append('\n');
            return sb.toString().trim();
        } catch (IOException e) {
            return "";
        }
    }
}
