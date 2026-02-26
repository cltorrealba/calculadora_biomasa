import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeEnvironment,
  parseHostnames,
  detectHostEnvironment,
  resolveRuntimeEnvironment,
  resolveFirestoreNamespace
} from '../src/lib/environment.js'

test('normalizeEnvironment accepts valid values only', () => {
  assert.equal(normalizeEnvironment('production'), 'production')
  assert.equal(normalizeEnvironment('STAGING'), 'staging')
  assert.equal(normalizeEnvironment('invalid'), '')
})

test('detectHostEnvironment identifies local and staging hosts', () => {
  assert.equal(detectHostEnvironment('localhost'), 'local')
  assert.equal(
    detectHostEnvironment('qa.example.com', ['qa.example.com']),
    'staging'
  )
  assert.equal(detectHostEnvironment('my-staging.web.app'), 'staging')
})

test('resolveRuntimeEnvironment protects non-production hosts', () => {
  assert.equal(
    resolveRuntimeEnvironment({
      configuredEnvironment: 'production',
      hostname: 'localhost'
    }),
    'local'
  )

  assert.equal(
    resolveRuntimeEnvironment({
      configuredEnvironment: 'production',
      hostname: 'test.example.com',
      stagingHostnames: ['test.example.com']
    }),
    'staging'
  )
})

test('resolveRuntimeEnvironment uses configured value on production hosts', () => {
  assert.equal(
    resolveRuntimeEnvironment({
      configuredEnvironment: 'staging',
      hostname: 'prod.example.com'
    }),
    'staging'
  )
})

test('resolveFirestoreNamespace uses host guard to avoid production writes', () => {
  assert.equal(
    resolveFirestoreNamespace({
      configuredNamespace: 'production',
      runtimeEnvironment: 'production',
      hostEnvironment: 'staging'
    }),
    'staging'
  )

  assert.equal(
    resolveFirestoreNamespace({
      configuredNamespace: '',
      runtimeEnvironment: 'production',
      hostEnvironment: 'production'
    }),
    'production'
  )
})

test('parseHostnames handles empty and comma-separated values', () => {
  assert.deepEqual(parseHostnames(''), [])
  assert.deepEqual(
    parseHostnames(' a.example.com, B.example.com '),
    ['a.example.com', 'b.example.com']
  )
})
