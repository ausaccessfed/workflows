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
        'ausaccessfed/federationmanager',
        'ausaccessfed/discovery-service',
        'ausaccessfed/rapid-idp-manager'
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
            "datasourceTemplate": "github-releases",
            "matchStrings": [
                "\\s*#\\s*renovate:\\s*datasource=(?<datasource>[^\\s]+)\\s*depName=(?<depName>.*?)\\s*ARG\\s.*?_VERSION\\s*=\\s*\"*(?<currentValue>.*)\"*"
            ]
        },
        {
            "fileMatch": ["Dockerfile"],
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
    {
        "matchFileNames": ["Dockerfile"],
        "matchDepTypes": ["yum"],
        "groupName": "yum"
    },
    {
        "matchPackagePatterns": ["eslint", "prettier"],
        "groupName": "lint"
    }
    ]
};
