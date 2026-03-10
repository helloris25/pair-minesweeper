/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-vue', 'stylelint-config-recess-order'],
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
  ],
  rules: {
    // Порядок свойств задаётся через stylelint-config-recess-order

    // ограничение вложенности (читаемость, специфичность)
    'max-nesting-depth': [3, { ignore: ['blockless-at-rules'] }],

    // не использовать #id в стилях
    'selector-max-id': 0,

    // не более двух селекторов по типу подряд
    'selector-max-type': [2, { ignore: ['child', 'compounded'] }],

    // предупреждение на !important
    'declaration-no-important': true,

    // предупреждение при обратном порядке специфичности (требует ручной перестановки блоков)
    'no-descending-specificity': [true, { severity: 'warning' }],

    // Отключаем правила, конфликтующие с типичным Vue-стилем
    'custom-property-empty-line-before': null,
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'alpha-value-notation': null,
    'font-family-name-quotes': null,
    'rule-empty-line-before': null,
    // BEM-модификаторы (block--modifier) и составные классы
    'selector-class-pattern': null,
  },
  ignoreFiles: ['dist/**', 'node_modules/**', 'coverage/**'],
};
