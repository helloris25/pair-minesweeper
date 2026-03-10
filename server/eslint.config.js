const {
    defineConfig,
    globalIgnores,
} = require("eslint/config");

const tsParser = require("@typescript-eslint/parser");
const typescriptEslintEslintPlugin = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        parser: tsParser,
        sourceType: "module",

        parserOptions: {
            project: "tsconfig.json",
            tsconfigRootDir: __dirname,
        },

        globals: {
            ...globals.node,
        },
    },

    plugins: {
        "@typescript-eslint": typescriptEslintEslintPlugin,
    },

    extends: compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"),

    rules: {
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/only-throw-error": "error",
        "no-eval": "error",
        "no-implied-eval": "error",
        "no-new-func": "error",

        "no-console": ["warn", {
            allow: ["warn", "error"],
        }],

        "no-debugger": "error",

        "keyword-spacing": ["error", {
            after: true,
            before: true,
        }],

        "eqeqeq": ["error", "always"],
        "curly": ["error", "all"],
        "no-nested-ternary": "warn",
        "consistent-return": "error",
        "prefer-const": "error",
        "no-var": "error",
        "no-duplicate-imports": "error",

        "no-magic-numbers": ["warn", {
            ignore: [0, 1, -1],
            ignoreArrayIndexes: true,
            enforceConst: true,
            detectObjects: false,
        }],

        "complexity": ["warn", {
            max: 12,
        }],

        "max-depth": ["warn", 3],

        "max-lines-per-function": ["warn", {
            max: 60,
            skipBlankLines: true,
            skipComments: true,
        }],

        "max-params": ["warn", 4],
    },
}, globalIgnores(["**/.eslintrc.js"]), {
    files: ["**/*.dto.ts", "**/game.interface.ts"],

    rules: {
        "no-magic-numbers": "off",
    },
}, {
    files: ["src/main.ts"],

    rules: {
        "no-console": "off",
        "no-magic-numbers": "off",
    },
}]);
