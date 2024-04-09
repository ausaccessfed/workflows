const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended")
const eslintPluginYml = require("eslint-plugin-yml")

module.exports = [
  eslintPluginPrettierRecommended,
  ...eslintPluginYml.configs["flat/recommended"],
  {
    languageOptions: {
      parserOptions: {
        sourceType: "module"
      }
    },
    rules: {
      "class-methods-use-this": "warn",
      "no-param-reassign": [
        "error",
        {
          props: false
        }
      ],
      "no-tabs": "error",
      "no-plusplus": "off",
      "no-underscore-dangle": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "import/extensions": "off",
      "import/first": "off",
      "import/no-unresolved": "off",
      "prettier/prettier": "error",
      "yml/plain-scalar": "off",
      "yml/quotes": [
        "error",
        {
          prefer: "double"
        }
      ],
      "yml/indent": "off",
      "yml/sort-keys": "off",
      "yml/no-empty-mapping-value": "off",
      "yml/no-multiple-empty-lines": [
        "error",
        {
          max: 1
        }
      ],
      "yml/no-empty-document": "off"
    },
    settings: {}
  },
  {
    ignores: [
      ".DS_Store",
      "node_modules/",
      "tmp/",
      "coverage/",
      ".vscode/",
      "yarn.lock",
      "Gemfile.lock",
      ".env*",
      "!.env*.dist",
      "coverage/",
      "public/assets/",
      "**/.terraform/",
      "tmp/*",
      ".idea/*",
      "dump.rdb",
      "*.iml",
      "**/kustomization.yaml",
      "**/templates/",
      "**/values.yaml",
      "**/templates/",
      ".github/"
    ]
  }
  // {
  //   files: ["*.yaml", "*.yml"],
  //   languageOptions: {
  //     parser: eslintPluginYml
  //   }
  // }
]
