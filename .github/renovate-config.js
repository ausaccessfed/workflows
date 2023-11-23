module.exports = {
    username: 'aaf-terraform',
    gitAuthor: 'aaf-terraform <fishwhack9000+terraform@gmail.com>',
    onboarding: false,
    requireConfig: "optional",
    automerge: true,
    platform: 'github',
    forkProcessing: "disabled",
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
            "description": "Update Kubernetes version for Amazon EKS",
            "fileMatch": [".+\\.tf$"],
            "matchStrings": [
                "\\s*#\\s*renovate:\\s*datasource=(?<datasource>[^\\s]+)\\s*depName=(?<depName>.*?)( versioning=(?<versioning>.*?))?\\s.*?_version\\s*=\\s*\"(?<currentValue>.*)\""
            ],
            "datasourceTemplate": "endoflife-date",
            "versioningTemplate": "{{#if versioning}}{{{versioning}}}{{/if}}"
        },
        {
            "description": "Update dockerfile github releases",
            "fileMatch": [
                "Dockerfile"
            ],
            // i.e
            // # renovate: datasource=github-releases depName=goodwithtech/dockle
            // ARG DOCKLE_VERSION=0.4.0
            "datasourceTemplate": "github-releases",
            "matchStrings": [
                "\\s*#\\s*renovate:\\s*datasource=(?<datasource>[^\\s]+)\\s*depName=(?<depName>.*?)\\s*ARG\\s.*?_VERSION\\s*=\\s*\"*(?<currentValue>.*)\"*"
            ]
        },
        {
            "fileMatch": ["Dockerfile"],
            // i.e
            // # renovate: datasource=yum repo=rocky-9-appstream-x86_64
            // jq-1.6-13.el9 \
            "matchStrings": [
                "\\s*#\\s*renovate:\\s*datasource=(?<datasource>[^\\s]+)\\s*repo=(?<registryUrl>[^\\s]+)\\s+(?<depName>[^\\s]+)-(?<currentValue>[^\\s-]+-[^\\s-]+)"
            ],
            "datasourceTemplate": "npm",
            "depTypeTemplate": "yum",
            "versioningTemplate": "loose",
            "registryUrlTemplate": "https://yum2npm.io/repos/{{replace '/' '/modules/' registryUrl}}/packages"
        }
    ],
    packageRules: [{
        "matchPackageNames": ["cost-analyzer"],
        "sourceUrl": "https://github.com/kubecost/cost-analyzer-helm-chart",
        "registryUrl": "https://kubecost.github.io/cost-analyzer",
    }, {
        "matchDatasources": ["endoflife-date"],
        "matchPackageNames": ["amazon-eks"],
        "extractVersion": "^(?<version>.*)-eks.+$"
    },
    {
        "matchDatasources": ["github-releases"],
        "extractVersion": "^v(?<version>.*)$"
    },
    // used to group only yum installed packages
    {
        "matchFileNames": ["Dockerfile"],
        "matchDepTypes": ["yum"],
        "groupName": "yum"
    },
    // used to group only js linting packages
    {
        "matchPackagePatterns": ["eslint", "prettier"],
        "groupName": "lint"
    }
    ]
};
