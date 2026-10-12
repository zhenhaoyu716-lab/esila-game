const test = require('node:test');
const assert = require('node:assert/strict');
const { FruitWorld, RADII } = require('./physics.js');
const advance = (world, seconds) => { for(let i=0; i<seconds*120; i++) world.step(1/120); };

test('fruit settles on the floor and stays inside the basket', () => {
  const world = new FruitWorld(); const fruit = world.add(3, -20, 48, {vx:-300});
  advance(world, 5);
  assert.ok(fruit.x >= world.wall + fruit.r - .1);
  assert.ok(Math.abs(fruit.y + fruit.r - world.floor) < .1);
  assert.ok(Math.abs(fruit.vy) < 1);
});
test('matching fruits merge once and award the resulting fruit points', () => {
  const events = []; const world = new FruitWorld(event => events.push(event));
  world.add(0, 200, 540); world.add(0, 228, 540); advance(world, 1);
  assert.equal(world.bodies.length, 1); assert.equal(world.bodies[0].level, 1);
  assert.equal(events.length, 1); assert.equal(events[0].points, 1);
});
test('a falling fruit rebounds visibly, then loses energy and settles', () => {
  const world = new FruitWorld(); const fruit = world.add(3, 215, 48);
  let bounced = false, reboundHeight = 0;
  for (let i = 0; i < 360; i++) {
    world.step(1/120);
    if (fruit.vy < -100) bounced = true;
    if (bounced) reboundHeight = Math.max(reboundHeight, world.floor-fruit.r-fruit.y);
  }
  assert.ok(bounced); assert.ok(reboundHeight > 35);
  advance(world, 3); assert.ok(Math.abs(fruit.vy) < 1);
});
test('different fruits rebound on impact without creating energy', () => {
  const world = new FruitWorld();
  const a = world.add(3, 170, 250, {vx:200});
  const b = world.add(4, 251, 250, {vx:-200});
  world.step(1/120);
  assert.ok(b.vx-a.vx > 80);
  assert.ok(Math.abs(a.vx) < 200 && Math.abs(b.vx) < 200);
  assert.ok(a.impactStrength > 0 && b.impactStrength > 0);
});
test('different fruits stack without merging or excessive overlap', () => {
  const world = new FruitWorld(); world.add(3, 215, 538); world.add(4, 215, 445); advance(world, 6);
  assert.equal(world.bodies.length, 2);
  const [a,b] = world.bodies;
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y) >= a.r+b.r-.5);
});
test('largest fruit never merges beyond the final level', () => {
  const world = new FruitWorld(); world.add(10, 129, 400); world.add(10, 300, 230); advance(world, 4);
  assert.equal(world.bodies.length, 2); assert.ok(world.bodies.every(b => b.r === RADII[10]));
});
test('overflow has a grace period and clears when the basket is reset', () => {
  const world = new FruitWorld();
  // Alternating sizes create a full stack without matching adjacent fruit.
  for(let i=0;i<8;i++) world.add(i%2 ? 5 : 6, 215, world.floor-60-i*110, {age:3});
  assert.equal(world.step(1/120),false);
  advance(world,5); assert.ok(world.dangerTime >= 1.8);
  world.reset(); assert.equal(world.bodies.length,0); assert.equal(world.dangerTime,0);
});
