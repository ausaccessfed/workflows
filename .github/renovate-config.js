module.exports = {
    username: 'aaf-terraform',
    gitAuthor: 'aaf-terraform <fishwhack9000+terraform@gmail.com>',
    onboarding: false,
    requireConfig: "optional",
    platform: 'github',
    forkProcessing: "disabled",
    repositories: [
        'ausaccessfed/saml-service',
        'ausaccessfed/image-scanner'
    ],
    labels: ["dependencies"],
    ignorePaths: [
        "**/node_modules/**",
        "**/bower_components/**",
        "**/vendor/**",
        "**/examples/**",
        "**/__tests__/**",
        "**/tests/**",
        "**/__fixtures__/**",
        "**/.terraform/**"
    ],
    extends: [
        ":dependencyDashboard",
        ":semanticPrefixFixDepsChoreOthers",
        "group:monorepos",
        "group:recommended",
        "replacements:all",
        "workarounds:all"
    ],
    ignorePresets: [":prHourlyLimit2"],
    prHourlyLimit: 0,
    prConcurrentLimit: 0,
    commitMessageAction: "Upgrade",
    commitMessageTopic: "{{packageName}}/{{depName}}",
    commitMessageExtra: "{{currentVersion}} -> {{newVersion}}",
    regexManagers: [
        {
            "description": "Update dockerfile github releases",
            "fileMatch": [
                "Dockerfile"
            ],
            // i.e
            // # renovate: datasource=github-releases depName=goodwithtech/dockle
            // ARG DOCKLE_VERSION=0.4.0
            "matchStrings": [
                "#\\s*renovate:\\s*datasource=(?<datasource>.*?)\\s*depName=(?<depName>.*?)\\s*ARG\\s.*?_VERSION\\s*=\\s*\"*(?<currentValue>.*)\"*"
            ]
        }
    ],
    packageRules: [
    ]
};
