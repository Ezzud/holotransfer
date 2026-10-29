import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const androidDirectory = resolve("apps", "desktop", "src-tauri", "gen", "android");
const gradlePath = resolve(androidDirectory, "app", "build.gradle.kts");
const propertiesPath = resolve(androidDirectory, "keystore.properties");
const requiredVariables = [
  "ANDROID_KEYSTORE_PATH",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_PASSWORD",
];

for (const name of requiredVariables) {
  if (!process.env[name]) {
    throw new Error(`${name} is required for Android signing.`);
  }
}

writeFileSync(
  propertiesPath,
  [
    `keyAlias=${process.env.ANDROID_KEY_ALIAS}`,
    `storePassword=${process.env.ANDROID_KEYSTORE_PASSWORD}`,
    `keyPassword=${process.env.ANDROID_KEY_PASSWORD}`,
    `storeFile=${process.env.ANDROID_KEYSTORE_PATH}`,
    "",
  ].join("\n"),
  "utf8",
);

let gradle = readFileSync(gradlePath, "utf8");
if (!gradle.includes("import java.io.FileInputStream")) {
  gradle = `import java.io.FileInputStream\n${gradle}`;
}

const signingConfig = `    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }

`;

if (!/signingConfigs \{\r?\n\s+create\("release"\)/.test(gradle)) {
  const buildTypesIndex = gradle.indexOf("buildTypes {");
  if (buildTypesIndex < 0) {
    throw new Error("Could not find Android buildTypes block.");
  }
  gradle = `${gradle.slice(0, buildTypesIndex)}${signingConfig}${gradle.slice(buildTypesIndex)}`;
}

const releaseBlock = /getByName\("release"\)\s*\{\r?\n/;
if (!releaseBlock.test(gradle)) {
  throw new Error("Could not find Android release build type.");
}
if (!gradle.includes('signingConfig = signingConfigs.getByName("release")')) {
  gradle = gradle.replace(
    releaseBlock,
    'getByName("release") {\n            signingConfig = signingConfigs.getByName("release")\n',
  );
}
writeFileSync(gradlePath, gradle, "utf8");
console.log("Configured Android Gradle release signing.");
