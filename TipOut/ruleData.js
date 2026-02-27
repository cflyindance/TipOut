/**
 * ruleData.js - 小费分配规则数据存储
 */
(function() {
  var STORAGE_KEY = 'tipout_rules';

  var defaultRules = [
    {
      id: 1,
      ruleName: 'Tip Pool — Server & Bartender to Busser',
      store: 'Golden Dragon Chinese Kitchen - Dallas, TX 75231',
      poolRules: [
        { type: 'sales', pct: 4.5 },
        { type: 'tips', pct: 5.5 },
        { type: 'manual', pct: 6.5 }
      ],
      deductRoles: ['Server', 'Bartender', 'Cashier'],
      receivers: [
        { roles: ['Server'], pct: 30 },
        { roles: ['Busser', 'Runner'], pct: 70 }
      ],
      distribution: 'average',
      clockin: 'clock'
    },
    {
      id: 2,
      ruleName: 'Tip Pool — 多角色分配',
      store: 'Sakura Sushi & Ramen House - Dallas, TX 75247',
      poolRules: [{ type: 'tips', pct: 10 }],
      deductRoles: ['Server', 'Bartender', 'Cashier'],
      receivers: [
        { roles: ['Busser'], pct: 50 },
        { roles: ['Runner'], pct: 30 },
        { roles: ['Host'], pct: 20 }
      ],
      distribution: 'hours',
      clockin: 'clock'
    },
    {
      id: 3,
      ruleName: 'Tip Pool — Server to Busser/Runner',
      store: 'El Fuego Tex-Mex Grill - Plano, TX 75074',
      poolRules: [
        { type: 'sales', pct: 3 },
        { type: 'manual', pct: 8 }
      ],
      deductRoles: ['Server'],
      receivers: [
        { roles: ['Busser'], pct: 60 },
        { roles: ['Runner'], pct: 40 }
      ],
      distribution: 'orders',
      clockin: 'clock'
    },
    {
      id: 4,
      ruleName: 'Bar Tip Pool',
      store: 'Golden Dragon Chinese Kitchen - Dallas, TX 75231',
      poolRules: [{ type: 'tips', pct: 8 }],
      deductRoles: ['Bartender'],
      receivers: [{ roles: ['Busser'], pct: 100 }],
      distribution: 'average',
      clockin: 'clock'
    }
  ];

  var poolTypeNames = {
    sales: '销售额',
    tips: '小费',
    manual: '手动上报小费',
    custom: '自定义小费'
  };

  var distNames = {
    average: '按员工数量平均分配',
    hours: '按工作时长占比分配',
    orders: '按订单占比分配'
  };

  function getRules() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var list = JSON.parse(raw);
        return Array.isArray(list) ? list : defaultRules.slice();
      }
    } catch (e) {}
    return defaultRules.slice();
  }

  function saveRules(rules) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  }

  function getRuleById(id) {
    var rules = getRules();
    var numId = parseInt(id, 10);
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].id === numId) return rules[i];
    }
    return null;
  }

  function getNextRuleId() {
    var rules = getRules();
    var max = 0;
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].id > max) max = rules[i].id;
    }
    return max + 1;
  }

  function deleteRuleById(id) {
    var rules = getRules();
    var numId = parseInt(id, 10);
    var filtered = rules.filter(function(r) { return r.id !== numId; });
    saveRules(filtered);
  }

  function getRulesForStore(storeVal) {
    if (!storeVal) return [];
    var rules = getRules();
    var sv = (storeVal || '').trim();
    if (!sv) return [];
    return rules.filter(function(r) {
      var rs = (r.store || '').trim();
      if (!rs) return false;
      if (sv.indexOf(rs) >= 0 || rs.indexOf(sv) >= 0) return true;
      var parts = rs.split('-');
      var namePart = (parts[0] || '').trim();
      var locPart = (parts.slice(1).join('-') || '').trim();
      return namePart && sv.indexOf(namePart) === 0 && (!locPart || sv.indexOf(locPart) >= 0);
    });
  }

  function buildRuleDescription(rule) {
    var parts = [];
    if (rule.poolRules && rule.poolRules.length > 0) {
      var poolStr = rule.poolRules.map(function(p) {
        var name = poolTypeNames[p.type] || p.type;
        if (p.type === 'custom') return name + ' $' + (p.amount != null ? p.amount : 0) + ' × ' + (p.pct != null ? p.pct : 100) + '%';
        return p.pct != null ? name + ' × ' + p.pct + '%' : name;
      }).join(' + ');
      parts.push('Tip Pool = ' + poolStr);
    }
    if (rule.deductRoles && rule.deductRoles.length > 0) {
      parts.push('扣除方 ' + rule.deductRoles.join('/'));
    }
    if (rule.receivers && rule.receivers.length > 0) {
      var recStr = rule.receivers.map(function(r) {
        return (r.roles && r.roles.length ? r.roles.join('/') : '') + ' ' + (r.pct || 0) + '%';
      }).join(' / ');
      parts.push('接收方 ' + recStr);
    }
    if (rule.distribution) {
      parts.push(distNames[rule.distribution] || rule.distribution);
    }
    return parts.join('，');
  }

  // Expose globally
  window.ruleData = {
    getRules: getRules,
    saveRules: saveRules,
    getRuleById: getRuleById,
    getNextRuleId: getNextRuleId,
    getRulesForStore: getRulesForStore,
    deleteRuleById: deleteRuleById,
    buildRuleDescription: buildRuleDescription,
    poolTypeNames: poolTypeNames,
    distNames: distNames
  };
})();
