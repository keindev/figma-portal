// @see https://github.com/facebook/jest/issues/9430
// eslint-disable-next-line node/no-extraneous-import
import { jest } from '@jest/globals';

jest.useFakeTimers();

describe('Portal', () => {
  it('fake-test', () => {
    expect(true).toBeTruthy();
  });
});
