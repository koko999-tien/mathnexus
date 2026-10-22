import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyticsHostEnabled,
  telemetryErrorName,
  telemetryRouteTemplate,
} from '../../src/utils/observability.ts';

test('observability uses route templates instead of learning identifiers or query content', () => {
  assert.equal(telemetryRouteTemplate('/'), '/');
  assert.equal(telemetryRouteTemplate('/map'), '/map');
  assert.equal(telemetryRouteTemplate('/lesson/derivative-secret?answer=42'), '/lesson/:id');
  assert.equal(telemetryRouteTemplate('/book/some-book'), '/book/:id');
  assert.equal(telemetryRouteTemplate('/formula/deMoivre#proof'), '/formula/:id');
  assert.equal(telemetryRouteTemplate('/private-user-entered-path'), '/:unknown');
});

test('observability reports error classes without error messages', () => {
  const error = new TypeError('Nội dung riêng tư không được telemetry giữ lại');
  assert.equal(telemetryErrorName(error), 'TypeError');
  assert.equal(telemetryErrorName({ name: 'Custom Error!' }), 'Custom_Error_');
  assert.equal(telemetryErrorName('raw rejection text'), 'NonErrorRejection');
});

test('product analytics stays off on local and static-only hosts', () => {
  assert.equal(analyticsHostEnabled('mathnexus-three.vercel.app'), true);
  assert.equal(analyticsHostEnabled('preview-abc.vercel.app'), true);
  assert.equal(analyticsHostEnabled('localhost'), false);
  assert.equal(analyticsHostEnabled('127.0.0.1'), false);
  assert.equal(analyticsHostEnabled('::1'), false);
  assert.equal(analyticsHostEnabled('koko999-tien.github.io'), false);
});
