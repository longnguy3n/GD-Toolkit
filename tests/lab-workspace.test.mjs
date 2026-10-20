import test from 'node:test';
import assert from 'node:assert/strict';
import {upgradeWorkspace,validateWorkspace,activeProfile,addProfile} from '../core/workspace.mjs';
import {makeFlowLab,makeFlowScenario,simulateFlow} from '../core/flow.mjs';

test('old workspace remains valid without optional Economy data',()=>{
  const doc=upgradeWorkspace(null);
  assert.equal(activeProfile(doc).flowLab,undefined);
  validateWorkspace(doc);
});

test('Economy scenarios and result snapshots survive workspace round-trip and profile copy independently',()=>{
  const doc=upgradeWorkspace(null),profile=activeProfile(doc),scenario=makeFlowScenario('crafting');
  profile.flowLab={...makeFlowLab(),scenarios:[scenario],activeScenarioId:scenario.id};
  profile.flowLab.history.push(simulateFlow(scenario,{days:30,players:5},{rng:'custom',seed:42}));
  const restored=upgradeWorkspace(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(activeProfile(restored).flowLab,profile.flowLab);
  const copy=addProfile(doc,'Bản sao economy',profile);
  assert.deepEqual(copy.flowLab,profile.flowLab);
  copy.flowLab.scenarios[0].resources[0].initial=10;
  assert.equal(profile.flowLab.scenarios[0].resources[0].initial,5);
  assert.equal(copy.flowLab.history[0].scenario.resources[0].initial,5);
  validateWorkspace(doc);
});

test('invalid Economy references cannot enter a saved workspace',()=>{
  const doc=upgradeWorkspace(null),s=makeFlowScenario('crafting');
  activeProfile(doc).flowLab={...makeFlowLab(),scenarios:[s],activeScenarioId:s.id};
  s.rules[0].outputs[0].resource='deleted-resource';
  assert.throws(()=>validateWorkspace(doc),/tài nguyên/);
});
