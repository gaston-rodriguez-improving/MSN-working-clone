import test from 'node:test';
import assert from 'node:assert/strict';
import { adminCopy, adminLocale } from './copy.js';
import { formatName, stripHtml } from '../../helpers/stripHtml.js';

test('admin copy defaults to English and supports Spanish with interpolation', () => {
  assert.equal(adminCopy('Panel de administración'), 'Admin panel');
  assert.equal(adminCopy('Panel de administración', 'es'), 'Panel de administración');
  assert.equal(adminCopy('{email} ahora es administrador.', 'en', { email: 'user@example.com' }), 'user@example.com is now an administrator.');
  assert.equal(adminLocale(), 'en-US');
  assert.equal(adminLocale('es'), 'es-AR');
});

test('display names preserve allowed formatting while filtering executable markup', () => {
  const name = '<b><font color="#7A5CFA">Diana</font></b><img src=x onerror=alert(1)>';
  assert.equal(formatName(name, 80), '<b><font color="#7A5CFA">Diana</font></b>');
  assert.equal(stripHtml(name)[0], 'D');
});
