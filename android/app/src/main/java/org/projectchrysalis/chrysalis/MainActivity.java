package org.projectchrysalis.chrysalis;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.app.PendingIntent;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/** Start and stop the local server, open it in the browser, and check for a
 *  newer release. Chrysalis itself runs in the phone's browser. */
public final class MainActivity extends Activity implements EngineService.Listener {
    private TextView status;
    private TextView detail;
    private Button open;
    private Button toggle;
    private Button update;
    private AlertDialog logDialog;
    private boolean openWhenReady;
    /** A verified update waiting for the person to allow installs from this app. */
    private File awaitingPermission;
    private String updateLabel;
    private String updatePage;
    private boolean updating;

    static final String ACTION_INSTALL_STATUS = "io.github.molfarwav.vertep.INSTALL_STATUS";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        status = findViewById(R.id.status);
        detail = findViewById(R.id.detail);
        open = findViewById(R.id.open);
        toggle = findViewById(R.id.toggle);
        update = findViewById(R.id.update);
        ((TextView) findViewById(R.id.version)).setText(BuildConfig.VERSION_NAME);

        open.setOnClickListener(v -> {
            if (EngineService.state().phase == EngineService.Phase.RUNNING) {
                openBrowser();
            } else {
                openWhenReady = true;
                start();
            }
        });
        toggle.setOnClickListener(v -> {
            EngineService.Phase phase = EngineService.state().phase;
            if (phase == EngineService.Phase.STOPPED || phase == EngineService.Phase.FAILED) start();
            else startService(new Intent(this, EngineService.class).setAction(EngineService.ACTION_STOP));
        });
        findViewById(R.id.logs).setOnClickListener(v -> showLogs());
        findViewById(R.id.battery).setOnClickListener(v -> askBatteryExemption());

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
        checkForUpdate();
        // a fresh launch starts the server: that is what opening the app means
        if (savedInstanceState == null && EngineService.state().phase == EngineService.Phase.STOPPED) {
            openWhenReady = true;
            start();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        EngineService.addListener(this);
        PowerManager pm = getSystemService(PowerManager.class);
        boolean exempt = pm.isIgnoringBatteryOptimizations(getPackageName());
        findViewById(R.id.battery).setVisibility(exempt ? View.GONE : View.VISIBLE);
        findViewById(R.id.battery_hint).setVisibility(exempt ? View.GONE : View.VISIBLE);
        // back from "Install unknown apps": carry on with the update if it was allowed
        if (awaitingPermission != null && getPackageManager().canRequestPackageInstalls()) {
            File apk = awaitingPermission;
            awaitingPermission = null;
            install(apk);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (ACTION_INSTALL_STATUS.equals(intent.getAction())) onInstallStatus(intent);
    }

    @Override
    protected void onPause() {
        EngineService.removeListener(this);
        super.onPause();
    }

    private void start() {
        try {
            startForegroundService(new Intent(this, EngineService.class).setAction(EngineService.ACTION_START));
        } catch (RuntimeException e) {
            // the system refused to start the service: say so on screen
            Log.e("MolfarVertep", "Could not start the engine service", e);
            openWhenReady = false;
            EngineService.reportFailure(e.getMessage() == null ? e.toString() : e.getMessage());
        }
    }

    @Override
    public void onState(EngineService.State s) {
        detail.setVisibility(View.GONE);
        switch (s.phase) {
            case STOPPED:
                status.setText(R.string.status_stopped);
                toggle.setText(R.string.action_start);
                break;
            case UNPACKING:
                status.setText(getString(R.string.status_unpacking, s.percent));
                toggle.setText(R.string.action_stop);
                break;
            case STARTING:
                status.setText(R.string.status_starting);
                toggle.setText(R.string.action_stop);
                break;
            case RUNNING:
                status.setText(R.string.status_running);
                detail.setText(s.url);
                detail.setVisibility(View.VISIBLE);
                toggle.setText(R.string.action_stop);
                if (openWhenReady) {
                    openWhenReady = false;
                    openBrowser();
                }
                break;
            case FAILED:
                status.setText(R.string.status_failed);
                if (s.error != null && !s.error.isEmpty()) {
                    detail.setText(s.error);
                    detail.setVisibility(View.VISIBLE);
                }
                toggle.setText(R.string.action_start);
                openWhenReady = false;
                break;
        }
        open.setEnabled(s.phase == EngineService.Phase.RUNNING || s.phase == EngineService.Phase.STOPPED || s.phase == EngineService.Phase.FAILED);
    }

    /** Open the server in the browser; before any account exists, open the
     *  first-run link instead. */
    private void openBrowser() {
        String base = EngineService.currentUrl(this);
        if (base == null) return;
        new Thread(() -> {
            String url = base;
            try {
                JSONObject users = Http.getJson(base + "/v1/auth/users", 3000);
                if (users.optBoolean("setup")) url = base + "/#setup=" + EngineService.setupToken(this);
            } catch (Exception ignored) {
                // open the plain address; the page explains what is wrong
            }
            String target = url;
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(target)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(this, getString(R.string.no_browser, base), Toast.LENGTH_LONG).show();
                }
            });
        }, "chrysalis-open").start();
    }

    /** What the launcher did on the last Start, then the end of the engine
     *  log, or the service output when the engine never got far enough to
     *  write one. */
    private String logText() {
        File engineLog = new File(EngineService.homeDir(this), "data/logs/chrysalis.log");
        String text = EngineService.lastLines(engineLog, 400);
        String output = EngineService.lastLines(EngineService.outputFile(this), 60);
        String launcher = EngineService.lastLines(EngineService.launcherLogFile(this), 80);
        StringBuilder sb = new StringBuilder("Molfar Vertep " + BuildConfig.VERSION_NAME + " (Android " + Build.VERSION.RELEASE + ")\n\n");
        sb.append("Launcher\n").append(launcher.isEmpty() ? "(nothing yet)" : launcher).append("\n\n");
        String engine = text.isEmpty() ? output : text;
        if (!engine.isEmpty()) sb.append("Engine\n").append(engine);
        return sb.toString().trim();
    }

    private void copyLog() {
        getSystemService(ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("Molfar Vertep log", logText()));
        Toast.makeText(this, R.string.log_copied, Toast.LENGTH_SHORT).show();
    }

    /** The log on screen, tailed every couple of seconds while the dialog is
     *  open. Scrolling up pauses the auto-scroll so reading is not fought. */
    private void showLogs() {
        TextView view = new TextView(this);
        int pad = Math.round(getResources().getDisplayMetrics().density * 14);
        view.setPadding(pad, pad, pad, pad);
        view.setTypeface(Typeface.MONOSPACE);
        view.setTextSize(11);
        view.setTextColor(getColor(R.color.ink));
        view.setTextIsSelectable(true);

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(getColor(R.color.base));
        scroll.addView(view, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        scroll.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, Math.round(getResources().getDisplayMetrics().heightPixels * 0.55f)));

        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle(R.string.logs_title)
            .setView(scroll)
            .setPositiveButton(R.string.logs_close, null)
            .setNeutralButton(R.string.logs_copy, null)
            .create();

        Handler handler = new Handler(Looper.getMainLooper());
        Runnable[] tail = new Runnable[1];
        tail[0] = () -> {
            new Thread(() -> {
                String text = logText();
                runOnUiThread(() -> {
                    if (!dialog.isShowing()) return;
                    boolean atBottom = atBottom(scroll);
                    view.setText(text.isEmpty() ? getString(R.string.logs_empty) : text);
                    if (atBottom) scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN));
                });
            }, "chrysalis-log").start();
            handler.postDelayed(tail[0], 2000);
        };
        dialog.setOnDismissListener(d -> handler.removeCallbacks(tail[0]));
        dialog.setOnShowListener(d -> {
            // Copy keeps the dialog open: the log stays readable while it is shared
            dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v -> copyLog());
        });
        logDialog = dialog;
        dialog.show();
        tail[0].run();
    }

    @Override
    protected void onDestroy() {
        // the tail runnable must not outlive the activity behind the dialog
        if (logDialog != null && logDialog.isShowing()) logDialog.dismiss();
        super.onDestroy();
    }

    private boolean atBottom(ScrollView scroll) {
        View child = scroll.getChildAt(0);
        if (child == null) return true;
        int slack = Math.round(getResources().getDisplayMetrics().density * 24);
        return child.getBottom() - (scroll.getHeight() + scroll.getScrollY()) <= slack;
    }

    @SuppressWarnings("BatteryLife")
    private void askBatteryExemption() {
        try {
            startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName())));
        } catch (ActivityNotFoundException e) {
            startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        }
    }

    /** A newer release on the project's GitHub page shows a button. The app
     *  downloads the APK itself, checks it is our release signed with our key,
     *  and hands it to Android's installer, which asks the person to confirm.
     *  A staging build follows the rolling staging-latest pre-release instead
     *  of the stable latest: it is replaced on every push, so any build other
     *  than this one is newer. */
    private void checkForUpdate() {
        String repo = BuildConfig.REPOSITORY;
        if (!repo.startsWith("https://github.com/")) return;
        String slug = repo.substring("https://github.com/".length()).replaceAll("\\.git$|/$", "");
        boolean staging = BuildConfig.VERSION_NAME.contains("-staging");
        new Thread(() -> {
            try {
                JSONObject release = Http.getJson(
                    "https://api.github.com/repos/" + slug + (staging ? "/releases/tags/staging-latest" : "/releases/latest"),
                    8000);
                String tag = release.optString("tag_name", "").replaceFirst("^v", "");
                String apkName = "Molfar-Vertep-" + BuildConfig.VERSION_NAME + "-android-arm64.apk";
                String page = release.getString("html_url");
                Updater.Asset apk = null;
                boolean carriesThisBuild = false;
                JSONArray assets = release.optJSONArray("assets");
                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject asset = assets.optJSONObject(i);
                        String name = asset == null ? "" : asset.optString("name", "");
                        if (!name.endsWith("-android-arm64.apk")) continue;
                        if (name.equals(apkName)) carriesThisBuild = true;
                        apk = new Updater.Asset(name, asset.optString("browser_download_url", ""), asset.optLong("size", 0), asset.optString("digest", null));
                    }
                }
                // a staging release still uploading has no APK yet: nothing to offer
                if (staging ? apk == null || carriesThisBuild : !Versions.newer(tag, BuildConfig.VERSION_NAME)) return;
                final Updater.Asset found = apk;
                runOnUiThread(() -> {
                    updateLabel = staging ? getString(R.string.action_update_staging) : getString(R.string.action_update, tag);
                    updatePage = found != null ? found.url : page;
                    update.setText(updateLabel);
                    update.setVisibility(View.VISIBLE);
                    // no APK in the release: its page is all there is to offer
                    update.setOnClickListener(v -> {
                        if (found == null) openUrl(page);
                        else startUpdate(found);
                    });
                });
            } catch (Exception ignored) {
                // offline or no releases yet
            }
        }, "chrysalis-update").start();
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, getString(R.string.no_browser, url), Toast.LENGTH_LONG).show();
        }
    }

    private void startUpdate(Updater.Asset asset) {
        if (updating) return;
        updating = true;
        update.setEnabled(false);
        update.setText(getString(R.string.update_downloading, 0));
        new Thread(() -> {
            try {
                File apk = Updater.download(this, asset, p -> runOnUiThread(() -> update.setText(getString(R.string.update_downloading, p))));
                runOnUiThread(() -> update.setText(R.string.update_checking));
                Updater.Verdict verdict = Updater.check(this, apk);
                runOnUiThread(() -> {
                    switch (verdict) {
                        case OK:
                        case UNKNOWN_KEY:
                            install(apk);
                            break;
                        case OTHER_KEY:
                            apk.delete();
                            updateDone();
                            showReinstall();
                            break;
                        case NOT_OURS:
                            apk.delete();
                            updateDone();
                            showUpdateFailed(getString(R.string.update_not_ours));
                            break;
                    }
                });
            } catch (IOException e) {
                Log.w("MolfarVertep", "Update download failed", e);
                runOnUiThread(() -> {
                    updateDone();
                    showUpdateFailed(e.getMessage() == null ? e.toString() : e.getMessage());
                });
            }
        }, "chrysalis-download").start();
    }

    private void updateDone() {
        updating = false;
        update.setEnabled(true);
        if (updateLabel != null) update.setText(updateLabel);
    }

    /** Hand a verified APK to Android's installer. The first time, Android
     *  wants the person to allow installs from this app; onResume picks the
     *  update up again when they come back with it allowed. */
    private void install(File apk) {
        if (!getPackageManager().canRequestPackageInstalls()) {
            awaitingPermission = apk;
            updateDone();
            Toast.makeText(this, R.string.update_allow_installs, Toast.LENGTH_LONG).show();
            startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
            return;
        }
        update.setText(R.string.update_installing);
        PackageInstaller installer = getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(getPackageName());
        try {
            int id = installer.createSession(params);
            try (PackageInstaller.Session session = installer.openSession(id)) {
                try (InputStream in = new FileInputStream(apk); OutputStream out = session.openWrite("base.apk", 0, apk.length())) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    session.fsync(out);
                }
                // the installer fills in the status, so the intent must be mutable
                Intent status = new Intent(this, MainActivity.class).setAction(ACTION_INSTALL_STATUS);
                PendingIntent pending = PendingIntent.getActivity(this, id, status, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
                session.commit(pending.getIntentSender());
            }
        } catch (IOException | RuntimeException e) {
            Log.w("MolfarVertep", "Update install failed", e);
            updateDone();
            showUpdateFailed(e.getMessage() == null ? e.toString() : e.getMessage());
        }
    }

    /** What the installer reports back. Success replaces this process, so
     *  only the confirmation step and failures arrive here in practice. */
    @SuppressWarnings("deprecation")
    private void onInstallStatus(Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = Build.VERSION.SDK_INT >= 33
                ? intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class)
                : intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return;
        }
        updateDone();
        if (status == PackageInstaller.STATUS_SUCCESS || status == PackageInstaller.STATUS_FAILURE_ABORTED) return;
        // a key the parser could not compare, refused by the system after all
        if (status == PackageInstaller.STATUS_FAILURE_CONFLICT) {
            showReinstall();
            return;
        }
        String message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        showUpdateFailed(message == null ? "status " + status : message);
    }

    /** The update is signed with another key: Android will never install it
     *  over this app. Say what to do instead, once. */
    private void showReinstall() {
        new AlertDialog.Builder(this)
            .setTitle(R.string.reinstall_title)
            .setMessage(R.string.reinstall_body)
            .setPositiveButton(R.string.reinstall_download, (d, w) -> openUrl(updatePage))
            .setNeutralButton(R.string.action_open, (d, w) -> openBrowser())
            .setNegativeButton(R.string.logs_close, null)
            .show();
    }

    private void showUpdateFailed(String why) {
        new AlertDialog.Builder(this)
            .setTitle(R.string.update_failed_title)
            .setMessage(why)
            .setPositiveButton(R.string.update_in_browser, (d, w) -> openUrl(updatePage))
            .setNegativeButton(R.string.logs_close, null)
            .show();
    }
}
