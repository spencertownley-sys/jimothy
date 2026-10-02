import Phaser from 'phaser';
import { CONFIG, type PowerState } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { bus, EV, type HudState } from '../core/events';
import { Haptics } from '../core/haptics';
import { getInput } from '../core/input';
import { newRun, RUN_KEY, type RunState } from '../core/run';
import { Save } from '../core/save/Save';
import { getProp, objectRect, objectType, type TiledObjectLike } from '../core/tiled';
import { heartsFor, resolveBlockItem, type PowerUpKind } from '../data/powerups';
import { Brick } from '../entities/blocks/Brick';
import { Checkpoint } from '../entities/blocks/Checkpoint';
import { QuestionBlock, type BlockHost } from '../entities/blocks/QuestionBlock';
import { spawnProp } from '../entities/blocks/Prop';
import { Sign } from '../entities/blocks/Sign';
import { Enemy, spawnEnemy, type EnemyContext } from '../entities/enemies';
import { Geoduck } from '../entities/items/Geoduck';
import { Latte } from '../entities/items/Latte';
import { PowerUp } from '../entities/items/PowerUp';
import { RainDrop } from '../entities/items/RainDrop';
import { Player, type PlayerHost } from '../entities/Player';
import { levelById, nextLevelId, type LevelDef } from '../levels/LevelDef';
import { loadLevel, type LoadedLevel } from '../levels/LevelLoader';
import { Parallax } from '../levels/Parallax';
import { COLORS, uiText } from '../ui/text';

export interface GameSceneData {
  levelId: string;
  spawn?: string;
}

interface Zone {
  kind: 'drain' | 'exit';
  rect: Phaser.Geom.Rectangle;
  obj: TiledObjectLike;
}

export class GameScene extends Phaser.Scene implements PlayerHost, BlockHost {
  private def!: LevelDef;
  private level!: LoadedLevel;
  private run!: RunState;
  player!: Player;
  get levelId(): string {
    return this.def.id;
  }

  /** dev/test hook: give Jimothy a power-up without fetching it */
  devPower(kind: PowerUpKind): void {
    this.player.applyPowerUp(kind);
  }

  /** dev/test hook: drop Jimothy somewhere else in the level */
  teleport(x: number, y: number): void {
    this.player.setPosition(x, y);
    this.player.body.reset(x, y);
    this.player.body.setVelocity(0, 0);
  }

  /** test hook */
  itemSnapshot(): { kind: string; x: number; y: number }[] {
    return (this.powerups.getChildren() as PowerUp[]).map((p) => ({ kind: p.kind, x: p.x, y: p.y }));
  }

  /** test hook */
  enemySnapshot(): { x: number; y: number; alive: boolean; id: string }[] {
    return (this.enemies.getChildren() as Enemy[]).map((e) => ({ x: e.x, y: e.y, alive: e.alive, id: e.def.id }));
  }
  private parallax!: Parallax;
  private enemies!: Phaser.Physics.Arcade.Group;
  private lattes!: Phaser.Physics.Arcade.Group;
  private geoducks!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private raindrops!: Phaser.Physics.Arcade.Group;
  private bits!: Phaser.Physics.Arcade.Group;
  private blocks!: Phaser.Physics.Arcade.StaticGroup;
  private checkpoints!: Phaser.Physics.Arcade.StaticGroup;
  private zones: Zone[] = [];
  private input_ = getInput().state;
  private timeMs = 0;
  private ending = false;
  private debugText?: Phaser.GameObjects.Text;
  private debugOn = false;
  private hudTick = 0;
  private onDebugKey = (e: KeyboardEvent): void => {
    if (e.code === CONFIG.DEBUG_KEY) this.debugOn = !this.debugOn;
  };
  private stepHandler = (delta: number): void => this.fixedStep(delta * 1000);

  constructor() {
    super({ key: 'Game' });
  }

  create(data: GameSceneData): void {
    const def = levelById(data.levelId);
    if (!def || !def.file) throw new Error(`unknown or unbuilt level "${data.levelId}"`);
    this.def = def;
    this.ending = false;
    this.timeMs = 0;
    this.zones = [];
    this.input_.reset();
    this.run = (this.registry.get(RUN_KEY) as RunState | undefined) ?? newRun(def.id);
    this.run.levelId = def.id;
    this.registry.set(RUN_KEY, this.run);

    this.level = loadLevel(this, def);
    this.physics.world.setBounds(0, 0, this.level.widthPx, this.level.heightPx + 600);
    this.physics.world.TILE_BIAS = CONFIG.TILE_BIAS;
    this.parallax = new Parallax(this, this.level.parallaxSet);

    this.enemies = this.physics.add.group();
    this.lattes = this.physics.add.group({ allowGravity: false });
    this.geoducks = this.physics.add.group({ allowGravity: false });
    this.powerups = this.physics.add.group();
    this.raindrops = this.physics.add.group();
    this.bits = this.physics.add.group();
    this.blocks = this.physics.add.staticGroup();
    this.checkpoints = this.physics.add.staticGroup();

    // spawn point: explicit (drains) → checkpoint for this level → start
    let spawnName = data.spawn ?? 'start';
    let spawn = this.level.spawns.get(spawnName) ?? this.level.spawns.get('start')!;
    if (!data.spawn && this.run.checkpoint && this.run.checkpoint.levelId === def.id) {
      spawn = { x: this.run.checkpoint.x, y: this.run.checkpoint.y };
      spawnName = 'checkpoint';
    }
    this.player = new Player(this, spawn.x, spawn.y, this, this.run.power);
    this.spawnObjects();
    this.time.addEvent({ delay: 420, loop: true, callback: () => { for (const l of this.lattes.getChildren() as Latte[]) l.spin(); } });

    const g = this.level.ground;
    const ow = this.level.oneway;
    const solids: (Phaser.Tilemaps.TilemapLayer | Phaser.Physics.Arcade.StaticGroup)[] = [g, this.blocks];
    if (ow) solids.push(ow);
    this.physics.add.collider(this.player, g);
    if (ow) this.physics.add.collider(this.player, ow);
    this.physics.add.collider(this.player, this.blocks, (_p, b) => this.onBlockTouch(b as QuestionBlock | Brick));
    for (const s of solids) {
      this.physics.add.collider(this.enemies, s);
      this.physics.add.collider(this.powerups, s);
      this.physics.add.collider(this.raindrops, s);
    }
    this.physics.add.overlap(this.player, this.lattes, (_p, l) => this.collectLatte(l as Latte));
    this.physics.add.overlap(this.player, this.geoducks, (_p, d) => this.collectGeoduck(d as Geoduck));
    this.physics.add.overlap(this.player, this.powerups, (_p, u) => this.collectPowerUp(u as PowerUp));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.onPlayerEnemy(e as Enemy));
    this.physics.add.overlap(this.player, this.checkpoints, (_p, c) => this.touchCheckpoint(c as Checkpoint));
    this.physics.add.overlap(this.raindrops, this.enemies, (d, e) => this.onDropEnemy(d as RainDrop, e as Enemy));

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
    cam.startFollow(this.player, false, CONFIG.CAMERA.LERP, CONFIG.CAMERA.LERP);
    cam.setDeadzone(CONFIG.CAMERA.DEADZONE_W, CONFIG.CAMERA.DEADZONE_H);
    cam.setFollowOffset(-CONFIG.CAMERA.LOOKAHEAD, 40);
    cam.fadeIn(300, 0, 0, 0);

    if (Save.get().options.drizzle && this.level.parallaxSet !== 'drain') {
      this.add.particles(0, 0, 'fx:drop', {
        x: { min: 0, max: CONFIG.WIDTH }, y: -12, lifespan: 1000, speedY: { min: 650, max: 850 }, speedX: -40,
        quantity: 1, frequency: 45, alpha: { start: 0.45, end: 0.05 }, scaleY: { min: 0.6, max: 1.3 },
      }).setScrollFactor(0).setDepth(40);
    }
    this.debugText = uiText(this, 12, CONFIG.HEIGHT - 30, '', { fontSize: 14, color: COLORS.paper, display: false }).setScrollFactor(0).setDepth(100).setVisible(false);
    window.addEventListener('keydown', this.onDebugKey);

    if (!this.scene.isActive('HUD')) this.scene.launch('HUD');
    this.scene.bringToTop('HUD');
    this.time.delayedCall(0, () => this.pushHud());
    AudioManager.music(this.player.flannelMs > 0 ? 'flannel' : this.level.music);

    // Keep the world reference: by the time SHUTDOWN fires `this.physics.world` may already be
    // gone, and a listener left behind would run every fixed step twice after a restart.
    const world = this.physics.world;
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.stepHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.stepHandler);
      window.removeEventListener('keydown', this.onDebugKey);
      this.parallax.destroy();
    });
    if (spawnName === 'checkpoint') this.toast('☕');
  }

  // --- spawning ---------------------------------------------------------------------

  private spawnObjects(): void {
    for (const obj of this.level.objects) {
      const type = objectType(obj);
      const r = objectRect(obj);
      if (type.startsWith('enemy:')) {
        const e = spawnEnemy(this, type.slice(6), r.centerX, r.bottom, obj);
        if (e) this.enemies.add(e);
        continue;
      }
      switch (type) {
        case 'latte':
          this.lattes.add(new Latte(this, r.centerX, r.centerY));
          break;
        case 'geoduck': {
          const index = getProp(obj, 'index', 0);
          if (!this.run.geoducksFound[index]) this.geoducks.add(new Geoduck(this, r.centerX, r.centerY, index));
          break;
        }
        case 'qblock':
          this.blocks.add(new QuestionBlock(this, r.centerX, r.centerY, getProp(obj, 'item', 'latte')));
          break;
        case 'brick':
          this.blocks.add(new Brick(this, r.centerX, r.centerY));
          break;
        case 'checkpoint':
          this.checkpoints.add(new Checkpoint(this, r.centerX, r.bottom, obj.name || 'cp'));
          break;
        case 'sign':
          new Sign(this, r.x, r.y, r.width, r.height, getProp(obj, 'text', ''));
          break;
        case 'drain':
          this.zones.push({ kind: 'drain', rect: new Phaser.Geom.Rectangle(r.x, r.y - 6, r.width, r.height + 6), obj });
          break;
        case 'exit':
          this.zones.push({ kind: 'exit', rect: new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height), obj });
          break;
        case 'prop':
          spawnProp(this, obj);
          break;
        case 'player_spawn':
          break;
        default:
          console.warn(`[level] unsupported object type "${type}" at ${r.x},${r.y}`);
      }
    }
    // the checkpoint he already touched stays lit
    if (this.run.checkpoint?.levelId === this.def.id) {
      for (const c of this.checkpoints.getChildren() as Checkpoint[]) {
        if (Math.abs(c.x - this.run.checkpoint.x) < 2) {
          c.activated = true;
          c.setFrame('checkpoint_on');
        }
      }
    }
  }

  // --- fixed step -----------------------------------------------------------------------

  private fixedStep(dtMs: number): void {
    this.input_.update();
    if (this.ending) return;
    if (this.input_.justPressed('start') && this.player.fsm !== 'Dead') {
      this.pauseGame();
      return;
    }
    this.timeMs += dtMs;
    this.hudTick += dtMs;
    if (this.hudTick >= 250) {
      this.hudTick = 0;
      this.pushHud();
    }

    // hazards under the feet
    const hz = this.level.hazards;
    if (hz && this.player.grounded) {
      const t = hz.getTileAtWorldXY(this.player.x, this.player.body.bottom - 2);
      this.player.inPothole = t?.properties?.hazard === 'pothole';
    } else this.player.inPothole = false;

    this.player.fixedUpdate(this.input_, dtMs);
    if (this.player.fsm !== 'Dead' && this.player.body.top > this.level.heightPx + 40) this.player.die();

    const ctx: EnemyContext = {
      player: this.player,
      cameraCenterX: this.cameras.main.midPoint.x,
      worldHeight: this.level.heightPx,
      dtMs,
      solidAt: (x, y) => this.solidAt(x, y),
      puff: (x, y) => this.puff(x, y),
    };
    for (const e of this.enemies.getChildren() as Enemy[]) e.fixedUpdate(ctx);
    for (const u of this.powerups.getChildren() as PowerUp[]) u.fixedUpdate();
    for (const d of this.raindrops.getChildren() as RainDrop[]) d.fixedUpdate(dtMs);

    if (this.player.fsm !== 'Dead') this.checkZones();

    // Phaser only resets blocked/touching in the first sub-step of a frame. Without this, catch-up
    // sub-steps on a slow frame skip tile separation and bodies sink through floors.
    for (const body of this.physics.world.bodies.entries) body.resetFlags();
  }

  private checkZones(): void {
    const pb = this.player.body;
    const prect = new Phaser.Geom.Rectangle(pb.x, pb.y, pb.width, pb.height);
    for (const z of this.zones) {
      if (!Phaser.Geom.Intersects.RectangleToRectangle(prect, z.rect)) continue;
      if (z.kind === 'exit') {
        this.levelClear(getProp(z.obj, 'vehicle', 'bus'));
        return;
      }
      if (z.kind === 'drain' && this.input_.get('down') && this.player.grounded) {
        this.enterDrain(getProp(z.obj, 'targetLevel', this.def.parent ?? this.def.id), getProp(z.obj, 'targetSpawn', 'start'));
        return;
      }
    }
  }

  override update(): void {
    const cam = this.cameras.main;
    this.parallax.update(cam);
    // gentle look-ahead in the facing direction; lerped so flipping never jitters the camera
    const target = -CONFIG.CAMERA.LOOKAHEAD * this.player.facing;
    cam.followOffset.x = Phaser.Math.Linear(cam.followOffset.x, target, CONFIG.CAMERA.LOOKAHEAD_LERP);
    if (this.debugText) {
      this.debugText.setVisible(this.debugOn);
      if (this.debugOn) this.debugText.setText(`${this.player.debugInfo()} | ${this.def.id} t=${(this.timeMs / 1000).toFixed(1)}s bodies=${this.physics.world.bodies.size}`);
    }
  }

  // --- world queries ----------------------------------------------------------------------

  private solidAt(x: number, y: number): boolean {
    const g = this.level.ground.getTileAtWorldXY(x, y);
    if (g && g.collides) return true;
    const o = this.level.oneway?.getTileAtWorldXY(x, y);
    return Boolean(o && o.index > 0);
  }

  isSpaceFree(x: number, y: number, w: number, h: number): boolean {
    const tiles = this.level.ground.getTilesWithinWorldXY(x, y, w, h, { isColliding: true });
    if (tiles.length > 0) return false;
    const rect = new Phaser.Geom.Rectangle(x, y, w, h);
    for (const b of this.blocks.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!b.body) continue;
      const bb = b.body as Phaser.Physics.Arcade.StaticBody;
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, new Phaser.Geom.Rectangle(bb.x, bb.y, bb.width, bb.height))) return false;
    }
    return true;
  }

  // --- interactions -------------------------------------------------------------------------

  private onBlockTouch(block: QuestionBlock | Brick): void {
    const pb = this.player.body;
    if (!(pb.touching.up && block.body.touching.down)) return;
    if (block instanceof QuestionBlock) block.bump(this);
    else block.bump(this.player, this);
  }

  private onPlayerEnemy(enemy: Enemy): void {
    if (!enemy.alive || this.player.fsm === 'Dead' || this.player.fsm === 'Victory') return;
    const pb = this.player.body;
    const eb = enemy.body;
    const prevBottom = pb.bottom - Math.max(pb.deltaY(), 0);
    const fromAbove = prevBottom <= eb.top + CONFIG.STOMP_TOLERANCE && pb.velocity.y >= 0;
    if (enemy.def.stompable && fromAbove) {
      const ctx: EnemyContext = {
        player: this.player, cameraCenterX: this.cameras.main.midPoint.x, worldHeight: this.level.heightPx, dtMs: 0,
        solidAt: (x, y) => this.solidAt(x, y), puff: (x, y) => this.puff(x, y),
      };
      if (enemy.onStomp(ctx)) this.player.bounce(this.input_.get('jump'));
      return;
    }
    enemy.onHitPlayer(this.player);
  }

  private onDropEnemy(drop: RainDrop, enemy: Enemy): void {
    if (!enemy.alive) return;
    enemy.defeat(drop.body.velocity.x < 0 ? -1 : 1);
    AudioManager.sfx('splash');
    drop.destroy();
  }

  private collectLatte(latte: Latte): void {
    latte.destroy();
    this.addLattes(1);
  }

  private addLattes(n: number): void {
    AudioManager.sfx('latte');
    this.run.lattes += n;
    this.run.lattesThisLevel += n;
    if (this.run.lattes >= CONFIG.LATTES_PER_LIFE) {
      this.run.lattes -= CONFIG.LATTES_PER_LIFE;
      this.onExtraLife();
    }
    this.pushHud();
  }

  private collectGeoduck(duck: Geoduck): void {
    const index = duck.index;
    duck.destroy();
    this.run.geoducksFound[index] = true;
    Save.recordGeoduck(this.def.parent ?? this.def.id, index);
    AudioManager.sfx('geoduck');
    Haptics.pulse('geoduck');
    this.burst(this.player.x, this.player.y - 40, 0xff6f61);
    this.pushHud();
  }

  private collectPowerUp(p: PowerUp): void {
    if (!p.collectable) return;
    const kind = p.kind;
    p.destroy();
    this.player.applyPowerUp(kind);
    bus.emit(EV.HUD_POWER, kind);
    this.pushHud();
  }

  private touchCheckpoint(c: Checkpoint): void {
    if (c.activated) return;
    c.activate();
    this.run.checkpoint = { levelId: this.def.id, x: c.x, y: c.y };
    this.toast('☕');
  }

  spawnFromBlock(item: string, x: number, y: number): void {
    const resolved = resolveBlockItem(item, this.player.power);
    if (resolved === 'latte') {
      const l = this.add.image(x, y - 24, 'items', 'latte').setDepth(3);
      this.tweens.add({ targets: l, y: y - 90, duration: 350, ease: 'Quad.out', yoyo: true, onComplete: () => l.destroy() });
      this.addLattes(CONFIG.LATTE_BLOCK_BURST);
      return;
    }
    if (resolved === 'geoduck') {
      this.geoducks.add(new Geoduck(this, x, y - CONFIG.TILE, 2));
      return;
    }
    AudioManager.sfx('powerup_appear');
    this.powerups.add(new PowerUp(this, x, y, resolved as PowerUpKind));
  }

  spawnBrickBits(x: number, y: number): void {
    for (const [vx, vy] of [[-140, -520], [140, -520], [-90, -360], [90, -360]]) {
      const bit = this.physics.add.sprite(x, y, 'blocks', 'brick_bit').setDepth(9);
      bit.body.checkCollision.none = true;
      bit.setVelocity(vx, vy);
      bit.setAngularVelocity(vx * 3);
      this.bits.add(bit);
      this.time.delayedCall(1200, () => bit.destroy());
    }
    this.puff(x, y);
  }

  onThrow(x: number, y: number, dir: 1 | -1): void {
    if (this.raindrops.countActive(true) >= CONFIG.RAINDROP_MAX) return;
    this.raindrops.add(new RainDrop(this, x, y, dir));
  }

  onPowerChanged(power: PowerState): void {
    this.run.power = power;
    this.pushHud();
  }

  onFlannel(active: boolean): void {
    AudioManager.music(active ? 'flannel' : this.level.music);
  }

  onExtraLife(): void {
    this.run.lives += 1;
    AudioManager.sfx('oneup');
    Haptics.pulse('oneup');
    this.toast('Jimothy!');
    this.pushHud();
  }

  onPlayerDied(): void {
    this.run.lives -= 1;
    this.run.power = 'small';
    this.registry.set(RUN_KEY, this.run);
    if (this.run.lives > 0) {
      const target = this.def.parent ?? this.def.id;
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ levelId: target }));
    } else {
      this.scene.stop('HUD');
      this.scene.start('GameOver');
    }
  }

  private enterDrain(targetLevel: string, targetSpawn: string): void {
    if (this.ending) return;
    this.ending = true;
    AudioManager.sfx('drain');
    this.run.power = this.player.power;
    this.run.elapsedMs += this.timeMs;
    this.player.body.setVelocity(0, 0);
    this.player.body.enable = false;
    this.tweens.add({ targets: this.player, y: this.player.y + 60, alpha: 0.2, duration: 500, ease: 'Sine.in' });
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ levelId: targetLevel, spawn: targetSpawn }));
  }

  private levelClear(vehicle: string): void {
    if (this.ending) return;
    this.ending = true;
    this.run.power = this.player.power;
    const totalMs = this.run.elapsedMs + this.timeMs;
    this.player.victory();
    AudioManager.stopMusic();
    AudioManager.sfx('clear');
    Haptics.pulse('clear');
    const groundY = this.player.y;
    const cam = this.cameras.main;
    const busSprite = this.add.image(cam.scrollX + CONFIG.WIDTH + 160, groundY, 'blocks', vehicle === 'bus' ? 'bus' : 'bus').setOrigin(0.5, 1).setDepth(9);
    this.tweens.add({
      targets: busSprite, x: this.player.x + 150, duration: CONFIG.EXIT_BUS_MS, ease: 'Quad.out',
      onComplete: () => {
        AudioManager.sfx('ticket');
        this.tweens.add({
          targets: this.player, x: busSprite.x, y: groundY - 20, alpha: 0, duration: 500, ease: 'Quad.in',
          onComplete: () => {
            this.tweens.add({
              targets: busSprite, x: cam.scrollX + CONFIG.WIDTH + 300, duration: 900, ease: 'Quad.in',
              onComplete: () => this.finishLevel(totalMs),
            });
          },
        });
      },
    });
  }

  private finishLevel(totalMs: number): void {
    const next = nextLevelId(this.def.id);
    const lattesThisLevel = this.run.lattesThisLevel;
    Save.recordClear(this.def.id, totalMs, this.run.geoducksFound, lattesThisLevel, next);
    this.run.checkpoint = null;
    this.run.elapsedMs = 0;
    this.run.lattesThisLevel = 0;
    this.registry.set(RUN_KEY, this.run);
    this.scene.stop('HUD');
    this.scene.start('LevelClear', {
      levelId: this.def.id, name: this.level.name, timeMs: totalMs, par: this.level.par,
      lattes: lattesThisLevel, geoducks: [...this.run.geoducksFound], lives: this.run.lives, next,
    });
  }

  private pauseGame(): void {
    AudioManager.sfx('pause');
    AudioManager.setPaused(true);
    this.scene.launch('Pause', { levelId: this.def.parent ?? this.def.id });
    this.scene.pause();
  }

  // --- vfx / hud ---------------------------------------------------------------------------

  private puff(x: number, y: number): void {
    const p = this.add.image(x, y, 'blocks', 'puff').setDepth(12).setAlpha(0.9);
    this.tweens.add({ targets: p, scale: 2.2, alpha: 0, duration: 260, onComplete: () => p.destroy() });
  }

  private burst(x: number, y: number, tint: number): void {
    const e = this.add.particles(x, y, 'fx:spark', {
      speed: { min: 120, max: 260 }, lifespan: 500, quantity: 16, scale: { start: 1, end: 0 }, tint, emitting: false,
    }).setDepth(12);
    e.explode(16);
    this.time.delayedCall(700, () => e.destroy());
  }

  private toast(text: string): void {
    bus.emit(EV.HUD_TOAST, text);
  }

  private pushHud(): void {
    const state: HudState = {
      hearts: heartsFor(this.player.power),
      maxHearts: 3,
      lattes: this.run.lattes,
      lives: this.run.lives,
      geoducks: [...this.run.geoducksFound],
      timeMs: this.run.elapsedMs + this.timeMs,
      power: this.player.power,
    };
    bus.emit(EV.HUD_UPDATE, state);
  }
}
