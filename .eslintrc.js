module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'airbnb-base'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'eol-last': 'off',
    'func-names': 'off',
    'arrow-parens': 'off',
    'class-methods-use-this': 'off',
    'import/prefer-default-export': 'off',
    'no-useless-catch': 'off',
    'lines-between-class-members': 'off',
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
    'prefer-arrow-callback': 'off',
    'import/no-extraneous-dependencies': 'off',
  },
};
