(function (root) {
  'use strict';

  function matchesConditions(rule, context) {
    const c = rule.conditions || {};
    if (c.planet && context.planet !== c.planet) return false;
    if (c.house !== undefined && context.house !== c.house) return false;
    if (c.sign && context.sign !== c.sign) return false;
    if (c.occupiedBy && !c.occupiedBy.every(p => (context.housePlanets || []).includes(p))) return false;
    if (c.emptyHouse === true && (context.housePlanets || []).length !== 0) return false;
    return true;
  }

  function evaluate(rules, contexts) {
    const schema = root.LalKitabRuleSchema;
    if (!schema) throw new Error('Rule schema is not loaded');
    const safeRules = (rules || []).filter(rule => schema.isEligibleForInterpretation(rule));
    const findings = [];
    for (const context of contexts || []) {
      for (const rule of safeRules) {
        if (matchesConditions(rule, context)) {
          findings.push({
            ruleId: rule.id,
            title: rule.title,
            paraphrase: rule.paraphrase,
            source: rule.source,
            confidence: rule.confidence,
            context: { planet: context.planet || null, house: context.house || null, sign: context.sign || null },
            remedies: Array.isArray(rule.remedies) ? rule.remedies : []
          });
        }
      }
    }
    return findings;
  }

  root.LalKitabRuleEngine = { matchesConditions, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LalKitabRuleEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
