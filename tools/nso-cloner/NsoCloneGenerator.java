import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Vector;
import java.util.jar.Attributes;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.jar.JarInputStream;
import java.util.jar.JarOutputStream;
import java.util.jar.Manifest;

/**
 * Headless adapter for the class transformer contained in EmbedAdvMenu.jar.
 *
 * The original program is a J2ME UI application. This adapter calls its pure-Java
 * bytecode transformer directly, so templates can be produced once without an
 * emulator and the website only has to patch the server value at request time.
 */
public final class NsoCloneGenerator {
    private final Object transformer;
    private final Method resetMappings;
    private final Method readClassHeader;
    private final Method rewriteClassBody;
    private final Method writeClass;
    private final Method createStaticClass;
    private final Field staticDefinitions;

    private NsoCloneGenerator() throws Exception {
        Class<?> transformerClass = Class.forName("q");
        transformer = transformerClass.getConstructor().newInstance();
        resetMappings = transformerClass.getMethod("a");
        readClassHeader = transformerClass.getMethod("a", DataInputStream.class);
        rewriteClassBody = transformerClass.getMethod("a", DataInputStream.class, char.class);
        writeClass = transformerClass.getMethod("a", DataOutputStream.class);
        staticDefinitions = transformerClass.getField("a");

        Class<?> staticClassFactory = Class.forName("d");
        createStaticClass = staticClassFactory.getMethod("a", Vector.class, String.class);
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 3 || args.length > 4) {
            System.err.println("Usage: NsoCloneGenerator <input.jar> <output.jar> <clone-count> [display-name]");
            System.exit(2);
        }

        Path input = Path.of(args[0]).toAbsolutePath().normalize();
        Path output = Path.of(args[1]).toAbsolutePath().normalize();
        int cloneCount = Integer.parseInt(args[2]);
        if (cloneCount < 1 || cloneCount > 24) {
            throw new IllegalArgumentException("clone-count must be between 1 and 24");
        }
        if (!Files.isRegularFile(input)) {
            throw new IllegalArgumentException("Input JAR does not exist: " + input);
        }

        String displayName = args.length == 4 ? args[3].trim() : null;
        Files.createDirectories(output.getParent());
        new NsoCloneGenerator().generate(input, output, cloneCount, displayName);
        System.out.printf(Locale.ROOT, "Created %s (%d bytes, x%d)%n", output, Files.size(output), cloneCount);
    }

    @SuppressWarnings("unchecked")
    private void generate(Path input, Path output, int cloneCount, String requestedDisplayName) throws Exception {
        try (JarFile source = new JarFile(input.toFile())) {
            JarEntry manifestEntry = source.getJarEntry("META-INF/MANIFEST.MF");
            if (manifestEntry == null) {
                throw new IllegalArgumentException("Input JAR has no META-INF/MANIFEST.MF");
            }

            byte[] originalManifest = source.getInputStream(manifestEntry).readAllBytes();
            Manifest sourceManifest = new Manifest(new ByteArrayInputStream(originalManifest));
            Attributes attributes = sourceManifest.getMainAttributes();
            String midletOne = attributes.getValue("MIDlet-1");
            if (midletOne == null) {
                throw new IllegalArgumentException("Input JAR has no MIDlet-1 entry");
            }
            String[] midletParts = midletOne.split(",", 3);
            if (midletParts.length != 3) {
                throw new IllegalArgumentException("Invalid MIDlet-1 entry: " + midletOne);
            }

            String originalName = midletParts[0].trim();
            String iconPath = stripLeadingSlash(midletParts[1].trim());
            String mainClass = midletParts[2].trim();
            String displayName = requestedDisplayName == null || requestedDisplayName.isBlank()
                ? originalName + " x" + cloneCount
                : requestedDisplayName;
            String vendor = valueOr(attributes.getValue("MIDlet-Vendor"), "PhuongDev");
            String version = valueOr(attributes.getValue("MIDlet-Version"), "1.0");

            List<String> classEntries = new ArrayList<>();
            List<String> resourceEntries = new ArrayList<>();
            Enumeration<JarEntry> entries = source.entries();
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                if (entry.isDirectory() || entry.getName().equalsIgnoreCase("META-INF/MANIFEST.MF")) {
                    continue;
                }
                if (entry.getName().endsWith(".class")) {
                    classEntries.add(entry.getName());
                } else {
                    resourceEntries.add(entry.getName());
                }
            }
            if (classEntries.isEmpty()) {
                throw new IllegalArgumentException("Input JAR contains no classes");
            }

            String fingerprint = shortHash(originalManifest);
            String copiedIcon = "nso/" + fingerprint + ".png";
            String manifestIni = "nso/" + fingerprint + ".ini";
            byte[] launcherManifest = buildLauncherManifest(
                displayName, vendor, version, originalName, copiedIcon, manifestIni, mainClass, cloneCount
            );

            try (JarOutputStream jar = new JarOutputStream(Files.newOutputStream(output))) {
                Set<String> written = new HashSet<>();
                put(jar, written, "META-INF/MANIFEST.MF", launcherManifest);
                copyLauncherRuntime(jar, written);

                byte[] icon = readOptional(source, iconPath);
                if (icon == null) {
                    icon = readToolEntry("icon.png");
                }
                put(jar, written, "MrQuyet/mid.png", icon);
                put(jar, written, copiedIcon, icon);
                put(jar, written, manifestIni, originalManifest);

                for (int cloneIndex = 0; cloneIndex < cloneCount; cloneIndex++) {
                    String prefix = cloneIndex == 0 ? "" : ((char) ('a' + cloneIndex)) + "/";
                    char cloneKey = cloneIndex == 0 ? 'a' : (char) ('a' + cloneIndex);
                    Hashtable<String, String> mappings = (Hashtable<String, String>) resetMappings.invoke(null);
                    for (String classEntry : classEntries) {
                        String internalName = classEntry.substring(0, classEntry.length() - 6);
                        mappings.put(internalName, prefix + internalName);
                    }

                    for (String classEntry : classEntries) {
                        byte[] inputClass = source.getInputStream(source.getJarEntry(classEntry)).readAllBytes();
                        put(jar, written, prefix + classEntry, transform(inputClass, cloneKey));
                    }

                    Vector<?> definitions = (Vector<?>) staticDefinitions.get(null);
                    String staticName = prefix + "Static";
                    byte[] generatedStatic = (byte[]) createStaticClass.invoke(null, definitions, staticName);
                    if (generatedStatic != null) {
                        put(jar, written, staticName + ".class", generatedStatic);
                    }
                }

                for (String resourceEntry : resourceEntries) {
                    if (written.contains(resourceEntry)) {
                        continue;
                    }
                    put(jar, written, resourceEntry, source.getInputStream(source.getJarEntry(resourceEntry)).readAllBytes());
                }
            }
        }
    }

    private byte[] transform(byte[] classBytes, char cloneKey) throws Exception {
        DataInputStream input = new DataInputStream(new ByteArrayInputStream(classBytes));
        if (input.readInt() != 0xCAFEBABE) {
            return classBytes;
        }
        readClassHeader.invoke(transformer, input);
        rewriteClassBody.invoke(transformer, input, cloneKey);
        ByteArrayOutputStream output = new ByteArrayOutputStream(classBytes.length + 256);
        DataOutputStream data = new DataOutputStream(output);
        writeClass.invoke(transformer, data);
        data.flush();
        return output.toByteArray();
    }

    private static byte[] buildLauncherManifest(
        String displayName,
        String vendor,
        String version,
        String originalName,
        String copiedIcon,
        String manifestIni,
        String mainClass,
        int cloneCount
    ) {
        StringBuilder text = new StringBuilder(512);
        text.append("Manifest-Version: 1.0\r\n")
            .append("MicroEdition-Configuration: CLDC-1.1\r\n")
            .append("MicroEdition-Profile: MIDP-2.0\r\n")
            .append("MIDlet-Version: ").append(version).append("\r\n")
            .append("MIDlet-Vendor: ").append(vendor).append("\r\n")
            .append("MIDlet-Name: ").append(displayName).append("\r\n")
            .append("MIDlet-1: ").append(displayName).append(",/MrQuyet/mid.png,MrQuyet.MrQuyet\r\n");
        for (int i = 0; i < cloneCount; i++) {
            String classPrefix = i == 0 ? "" : ((char) ('a' + i)) + ".";
            text.append(i).append(": ")
                .append(originalName).append(' ').append(i + 1)
                .append(",/").append(copiedIcon)
                .append(',').append(classPrefix).append(mainClass)
                .append(",/").append(manifestIni).append("\r\n");
        }
        return text.append("\r\n").toString().getBytes(StandardCharsets.UTF_8);
    }

    private static void copyLauncherRuntime(JarOutputStream output, Set<String> written) throws Exception {
        copyNestedJar(output, written, "MrQuyetlibs.jar", false);
        copyNestedJar(output, written, "MrQuyetlib.jar", true);
    }

    private static void copyNestedJar(
        JarOutputStream output,
        Set<String> written,
        String nestedName,
        boolean skipDuplicateList
    ) throws Exception {
        byte[] nested = readToolEntry(nestedName);
        try (JarInputStream input = new JarInputStream(new ByteArrayInputStream(nested))) {
            JarEntry entry;
            while ((entry = input.getNextJarEntry()) != null) {
                String name = entry.getName();
                if (entry.isDirectory() || !name.endsWith(".class")) {
                    continue;
                }
                if (skipDuplicateList && name.endsWith("List.class")) {
                    continue;
                }
                put(output, written, name, input.readAllBytes());
            }
        }
    }

    private static byte[] readToolEntry(String name) throws Exception {
        try (var stream = NsoCloneGenerator.class.getClassLoader().getResourceAsStream(name)) {
            if (stream == null) {
                throw new IllegalStateException("EmbedAdvMenu resource not found: " + name);
            }
            return stream.readAllBytes();
        }
    }

    private static byte[] readOptional(JarFile jar, String name) throws IOException {
        JarEntry entry = jar.getJarEntry(name);
        return entry == null ? null : jar.getInputStream(entry).readAllBytes();
    }

    private static void put(JarOutputStream output, Set<String> written, String name, byte[] bytes) throws IOException {
        if (!written.add(name)) {
            return;
        }
        JarEntry entry = new JarEntry(name);
        entry.setTime(0L);
        output.putNextEntry(entry);
        output.write(bytes);
        output.closeEntry();
    }

    private static String shortHash(byte[] bytes) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
        StringBuilder hex = new StringBuilder(12);
        for (int i = 0; i < 6; i++) {
            hex.append(String.format(Locale.ROOT, "%02x", digest[i]));
        }
        return hex.toString();
    }

    private static String stripLeadingSlash(String value) {
        return value.startsWith("/") ? value.substring(1) : value;
    }

    private static String valueOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
