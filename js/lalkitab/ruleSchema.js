/**
 * Lal Kitab rule metadata and validation helpers.
 * Keep this layer independent of Parashari/KP interpretation logic.
 *
 * Rule paraphrases must be backed by a traceable source. Never use a
 * research-pending record to generate a prediction or recommend a remedy.
 */
(function (root) {
  'use strict';

  const CONFIDENCE = Object.freeze([
    'verified', 'cross-checked', 'provisional', 'disputed', 'rejected'
  ]);
  const EVIDENCE_TYPES = Object.freeze([
    'primary-text', 'licensed-translation', 'secondary-commentary',
    'unverified-web-summary'
  ]);
  const RULE_STATUSES = Object.freeze([
    'research-pending', 'active', 'disabled'
  ]);

  function validateRule(rule) {
    const errors = [];
    if (!rule || typeof rule !== 'object') return ['Rule must be an object'];
    if (!rule.id || typeof rule.id !== 'string') errors.push('Missing stable id');
    if (!rule.title || typeof rule.title !== 'string') errors.push('Missing title');
    if (!rule.module || typeof rule.module !== 'string') errors.push('Missing module');
    if (!RULE_STATUSES.includes(rule.status)) errors.push('Invalid status');
    if (!CONFIDENCE.includes(rule.confidence)) errors.push('Invalid confidence');
    if (!rule.source || typeof rule.source !== 'object') {
      errors.push('Missing source metadata');
    } else {
      if (!rule.source.title) errors.push('Missing source title');
      if (!rule.source.edition) errors.push('Missing source edition/year');
      if (!rule.source.evidenceType || !EVIDENCE_TYPES.includes(rule.source.evidenceType)) {
        errors.push('Missing/invalid source evidenceType');
      }
      if (rule.status === 'active' && !rule.source.pageOrSection) {
        errors.push('Active rules require a page, section, verse, or other pinpoint reference');
      }
    }
    if (rule.status === 'active' && (!rule.paraphrase || !rule.conditions)) {
      errors.push('Active rules require a paraphrase and structured conditions');
    }
    if (rule.remedies && !Array.isArray(rule.remedies)) errors.push('remedies must be an array');
    return errors;
  }

  function isEligibleForInterpretation(rule) {
    return validateRule(rule).length === 0 &&
      rule.status === 'active' &&
      (rule.confidence === 'verified' || rule.confidence === 'cross-checked') &&
      rule.source.evidenceType !== 'unverified-web-summary';
  }

  const api = { CONFIDENCE, EVIDENCE_TYPES, RULE_STATUSES, validateRule, isEligibleForInterpretation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LalKitabRuleSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
