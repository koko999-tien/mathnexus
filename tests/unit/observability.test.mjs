import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
