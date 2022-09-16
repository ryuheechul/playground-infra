// this will merge with with parent configs until meets with one that is `root: true`
module.exports = {
  globals: {
    describe: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
  }
};
