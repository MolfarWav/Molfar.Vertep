package org.projectchrysalis.chrysalis;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Downloads a release APK and decides whether it can update this install.
 *
 * Android installs an update over an app only when both carry the same signing
 * key; otherwise all it says is "App not installed". The early builds were
 * signed with a throwaway key per build, so that is exactly what people met.
 * Checking the download's key against ours first lets the app say what to do
 * instead (a one-time reinstall), and checking size, hash and package name
 * means nothing but our own release reaches the installer.
 */
final class Updater {
    private Updater() {}

    /** One APK of a release, as the GitHub API lists it. */
    static final class Asset {
        final String name;
        final String url;
        final long size;
        /** Lowercase hex, or null when the release does not list one. */
        final String sha256;

        Asset(String name, String url, long size, String digest) {
            this.name = name;
            this.url = url;
            this.size = size;
            this.sha256 = digest != null && digest.startsWith("sha256:") ? digest.substring(7).toLowerCase(Locale.ROOT) : null;
        }
    }

    interface Progress {
        void percent(int value);
    }

    /** Where a verified download waits for the installer. */
    static File dir(Context context) {
        return new File(context.getCacheDir(), "updates");
    }

    /** Release files come from GitHub and its download host, over https only. */
    static boolean trustedHost(URL url) {
        String host = url.getHost().toLowerCase(Locale.ROOT);
        return "https".equals(url.getProtocol())
            && (host.equals("github.com") || host.endsWith(".github.com") || host.endsWith(".githubusercontent.com"));
    }

    /** Download the asset, checking where it came from, its size and its hash. */
    static File download(Context context, Asset asset, Progress progress) throws IOException {
        URL start = new URL(asset.url);
        if (!trustedHost(start)) throw new IOException("not a GitHub download: " + start.getHost());
        File dir = dir(context);
        File[] old = dir.listFiles();
        if (old != null) for (File f : old) f.delete();
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("cannot create " + dir);
        File target = new File(dir, "update.apk");

        HttpURLConnection conn = (HttpURLConnection) start.openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        conn.setRequestProperty("User-Agent", "MolfarVertep-Android/" + BuildConfig.VERSION_NAME);
        conn.setRequestProperty("Accept", "application/octet-stream");
        MessageDigest sha;
        try {
            sha = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IOException(e);
        }
        try {
            int code = conn.getResponseCode();
            // redirects are followed within https; the host it ended on must be ours too
            if (!trustedHost(conn.getURL())) throw new IOException("redirected off GitHub: " + conn.getURL().getHost());
            if (code < 200 || code >= 300) throw new IOException("HTTP " + code);
            long total = asset.size > 0 ? asset.size : conn.getContentLengthLong();
            long done = 0;
            int shown = -1;
            try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(target)) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    sha.update(buf, 0, n);
                    done += n;
                    if (asset.size > 0 && done > asset.size) throw new IOException("the download is bigger than the release says");
                    int p = total > 0 ? (int) (done * 100 / total) : 0;
                    if (p != shown) progress.percent(shown = p);
                }
            }
            if (asset.size > 0 && done != asset.size) throw new IOException("the download stopped short (" + done + " of " + asset.size + " bytes)");
        } finally {
            conn.disconnect();
        }
        if (asset.sha256 != null && !asset.sha256.equals(hex(sha.digest()))) {
            target.delete();
            throw new IOException("the download does not match the release's checksum");
        }
        return target;
    }

    /** What the downloaded APK is, measured against the app installed now. */
    enum Verdict { OK, NOT_OURS, OTHER_KEY, UNKNOWN_KEY }

    static Verdict check(Context context, File apk) {
        PackageManager pm = context.getPackageManager();
        PackageInfo download = pm.getPackageArchiveInfo(apk.getPath(), PackageManager.GET_SIGNING_CERTIFICATES);
        if (download == null || !context.getPackageName().equals(download.packageName)) return Verdict.NOT_OURS;
        Set<String> theirs = signers(download.signingInfo);
        Set<String> ours;
        try {
            ours = signers(pm.getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES).signingInfo);
        } catch (PackageManager.NameNotFoundException e) {
            return Verdict.UNKNOWN_KEY;
        }
        // an archive the parser could not read the key of: the installer decides
        if (theirs.isEmpty() || ours.isEmpty()) return Verdict.UNKNOWN_KEY;
        return theirs.equals(ours) ? Verdict.OK : Verdict.OTHER_KEY;
    }

    /** SHA-256 of each certificate the APK is signed with now. */
    private static Set<String> signers(SigningInfo info) {
        Set<String> out = new HashSet<>();
        if (info == null) return out;
        Signature[] sigs = info.hasMultipleSigners() ? info.getApkContentsSigners() : info.getSigningCertificateHistory();
        if (sigs == null || sigs.length == 0) return out;
        // with one signer the history ends with the key in use; older ones are rotated out
        Signature[] current = info.hasMultipleSigners() ? sigs : new Signature[]{sigs[sigs.length - 1]};
        for (Signature s : current) {
            try {
                out.add(hex(MessageDigest.getInstance("SHA-256").digest(s.toByteArray())));
            } catch (NoSuchAlgorithmException ignored) {
                // every Android has SHA-256
            }
        }
        return out;
    }

    private static String hex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format(Locale.ROOT, "%02x", b));
        return sb.toString();
    }
}
