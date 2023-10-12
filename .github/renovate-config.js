module.exports = {
    username: 'aaf-terraform',
    gitAuthor: 'aaf-terraform <fishwhack9000+terraform@gmail.com>',
    onboarding: false,
    requireConfig: "optional",
    platform: 'github',
    forkProcessing: "disabled",
    repositories: [
        'ausaccessfed/saml-service',
        'ausaccessfed/image-scanner',
        'ausaccessfed/discovery-service',
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
            "fileMatch": ["Dockerfile"],
            // i.e
            // # renovate: datasource=github-releases depName=goodwithtech/dockle
            // ARG DOCKLE_VERSION=0.4.0
            "datasourceTemplate": "github-releases",
            "matchStrings": [
                "\\s*#\\s*renovate:\\s*datasource=github-releases\\s*depName=(?<depName>.*?)\\s*ARG\\s.*?_VERSION\\s*=\\s*\"*(?<currentValue>.*)\"*"
            ]
        },
        {
            "fileMatch": ["Dockerfile"],
            // i.e
            // # renovate: datasource=yum repo=rocky-9-appstream-x86_64
            // jq-1.6-13.el9 \
            "matchStrings": [
                "\\s*#\\s*renovate:\\s*datasource=yum\\s*repo=(?<registryUrl>[^\\s]+)\\s+(?<depName>[^\\s]+)-(?<currentValue>[^\\s-]+-[^\\s-]+)"
            ],
            "datasourceTemplate": "npm",
            "versioningTemplate": "loose",
            "registryUrlTemplate": "https://yum2npm.io/repos/{{replace '/' '/modules/' registryUrl}}/packages"
        }
    ],
    packageRules: [
    ]
};
