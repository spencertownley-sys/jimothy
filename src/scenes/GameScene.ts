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
import { Mover, type MoverLeg } from '../entities/blocks/Mover';
import { PathMover, throwPath, wheelPath } from '../entities/blocks/PathMover';
import { QuestionBlock, type BlockHost } from '../entities/blocks/QuestionBlock';
import { spawnProp } from '../entities/blocks/Prop';
import { SeeSaw } from '../entities/blocks/SeeSaw';
import { Sign } from '../entities/blocks/Sign';
import { CanadaGoose, Enemy, spawnEnemy, type EnemyContext } from '../entities/enemies';
import { Geoduck } from '../entities/items/Geoduck';
import { Latte } from '../entities/items/Latte';
import { PowerUp } from '../entities/items/PowerUp';
import { RainDrop } from '../entities/items/RainDrop';
import { Flock, type FlockHost } from '../entities/Flock';
import { Seagull } from '../entities/enemies/Seagull';
import { Player, type PlayerHost } from '../entities/Player';
import { levelById, nextLevelId, type LevelDef } from '../levels/LevelDef';
import { loadLevel, type LoadedLevel } from '../levels/LevelLoader';
import { Parallax } from '../levels/Parallax';
import { queueWorld } from '../levels/worlds';
import { COLORS, uiText } from '../ui/text';

export interface GameSceneData {
  levelId: string;
  spawn?: string;
}

interface Zone {
  kind: 'drain' | 'exit' | 'door' | 'pier';
  rect: Phaser.Geom.Rectangle;
  obj: TiledObjectLike;
}

/** Exit vehicles: how deep the hull sits, where the deck is, which way it leaves. */
const VEHICLES: Record<string, { sink: number; deck: number; leave: 'right' | 'down' }> = {
  boat: { sink: 34, deck: 0.42, leave: 'right' },
  kayak: { sink: 18, deck: 0.3, leave: 'right' },
  watertaxi: { sink: 40, deck: 0.5, leave: 'right' },
  handtruck: { sink: 0, deck: 0.62, leave: 'right' },
  elevator: { sink: 0, deck: 0.04, leave: 'down' },
};

interface Pad {
  img: Phaser.Physics.Arcade.Image;
  big: number;
  soft: number;
}

interface Water {
  rect: Phaser.Geom.Rectangle;
}

interface Slime {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  bornMs: number;
}

/** The 1-3 goose arena: walls close behind you, open when the goose flies off. */
interface Arena {
  rect: Phaser.Geom.Rectangle;
  engaged: boolean;
  done: boolean;
  hitsAtStart: number;
  walls: Phaser.GameObjects.GameObject[];
  boss?: CanadaGoose;
}

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
const easeIn = (t: number): number => t * t;
const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

type Ride = Mover | PathMover;

export class GameScene extends Phaser.Scene implements PlayerHost, BlockHost, FlockHost {
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
  private enemies!: Phaser.GameObjects.Group;
  private lattes!: Phaser.Physics.Arcade.Group;
  private geoducks!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private raindrops!: Phaser.GameObjects.Group;
  private bits!: Phaser.Physics.Arcade.Group;
  private blocks!: Phaser.Physics.Arcade.StaticGroup;
  private checkpoints!: Phaser.Physics.Arcade.StaticGroup;
  private zones: Zone[] = [];
  private movers: Ride[] = [];
  private gates: Mover[] = [];
  private moverGroup!: Phaser.Physics.Arcade.Group;
  private seesaws: SeeSaw[] = [];
  private bonfires!: Phaser.Physics.Arcade.StaticGroup;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private waters: Water[] = [];
  private slimes: Slime[] = [];
  private arena?: Arena;
  private flashZones: { rect: Phaser.Geom.Rectangle; cooldownMs: number }[] = [];
  private exitVehicle?: Phaser.GameObjects.Image;
  private pads: Pad[] = [];
  private padGroup!: Phaser.Physics.Arcade.StaticGroup;
  private statics!: Phaser.Physics.Arcade.StaticGroup;
  private pig?: { img: Phaser.Physics.Arcade.Image; standMs: number; done: boolean };
  private flock?: Flock;
  private riders: { img: Phaser.GameObjects.GameObject & { x: number; y: number }; ride: PathMover; dy: number }[] = [];
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

  /** Later worlds' tiles, backgrounds and maps load on first visit. */
  preload(): void {
    const data = this.sys.settings.data as GameSceneData | undefined;
    const def = data ? levelById(data.levelId) : undefined;
    if (def) queueWorld(this, def.world);
  }

  create(data: GameSceneData): void {
    const def = levelById(data.levelId);
    if (!def || !def.file) throw new Error(`unknown or unbuilt level "${data.levelId}"`);
    this.def = def;
    this.ending = false;
    this.timeMs = 0;
    this.zones = [];
    this.movers = [];
    this.gates = [];
    this.seesaws = [];
    this.waters = [];
    this.slimes = [];
    this.arena = undefined;
    this.flashZones = [];
    this.exitVehicle = undefined;
    this.pads = [];
    this.pig = undefined;
    this.flock = undefined;
    this.riders = [];
    this.input_.reset();
    this.run = (this.registry.get(RUN_KEY) as RunState | undefined) ?? newRun(def.id);
    this.run.levelId = def.id;
    this.registry.set(RUN_KEY, this.run);

    this.level = loadLevel(this, def);
    this.physics.world.setBounds(0, 0, this.level.widthPx, this.level.heightPx + 600);
    this.physics.world.TILE_BIAS = CONFIG.TILE_BIAS;
    this.parallax = new Parallax(this, this.level.parallaxSet);

    // Plain groups, not Arcade groups: adding to an Arcade group re-applies its default body
    // settings (zero velocity, gravity on, bounce 0), which undid Rain Drop throws and flyers.
    this.enemies = this.add.group();
    this.lattes = this.physics.add.group({ allowGravity: false });
    this.geoducks = this.physics.add.group({ allowGravity: false });
    this.powerups = this.physics.add.group();
    this.raindrops = this.add.group();
    this.bits = this.physics.add.group();
    this.blocks = this.physics.add.staticGroup();
    this.checkpoints = this.physics.add.staticGroup();
    this.moverGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.bonfires = this.physics.add.staticGroup();
    this.walls = this.physics.add.staticGroup();
    this.padGroup = this.physics.add.staticGroup();
    this.statics = this.physics.add.staticGroup();
    AudioManager.prefetchMusic(def.music);

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
    const solids: (Phaser.Tilemaps.TilemapLayer | Phaser.Physics.Arcade.StaticGroup | Phaser.Physics.Arcade.Group)[] = [g, this.blocks, this.walls, this.moverGroup, this.statics];
    if (ow) solids.push(ow);
    this.physics.add.collider(this.player, g);
    if (ow) this.physics.add.collider(this.player, ow);
    this.physics.add.collider(this.player, this.moverGroup);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.statics);
    this.physics.add.collider(this.player, this.padGroup, (_p, pad) => this.landOnPad(pad as Phaser.Physics.Arcade.Image));
    for (const ss of this.seesaws) {
      this.physics.add.collider(this.player, ss, () => ss.land(this.player, this.input_.get('jump')));
    }
    this.physics.add.overlap(this.player, this.bonfires, (_p, f) => this.touchBonfire(f as Phaser.Physics.Arcade.Image));
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
      this.flock?.destroy();
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
          this.blocks.add(new QuestionBlock(this, r.centerX, r.centerY, getProp(obj, 'item', 'latte'), getProp(obj, 'hidden', false), getProp(obj, 'style', '')));
          break;
        case 'water':
          this.spawnWater(r.x, r.y, r.width, r.height, getProp(obj, 'style', 'canal'));
          break;
        case 'salmon':
          this.spawnSalmon(r.centerX, r.y, r.bottom, getProp(obj, 'phase', 0), getProp(obj, 'dir', 1));
          break;
        case 'lockgate':
          this.spawnLockGate(r.centerX, r.y, r.width, r.height, getProp(obj, 'travel', 7), getProp(obj, 'phase', 0));
          break;
        case 'seesaw':
          this.seesaws.push(new SeeSaw(this, r.centerX, r.bottom, r.width, getProp(obj, 'tilt', -1) < 0 ? -1 : 1));
          break;
        case 'bonfire': {
          const f = this.bonfires.create(r.centerX, r.bottom, 'blocks', 'bonfire') as Phaser.Physics.Arcade.Image;
          f.setOrigin(0.5, 1).setDepth(6).refreshBody();
          (f.body as Phaser.Physics.Arcade.StaticBody).setSize(56, 40, false).setOffset((f.width - 56) / 2, f.height - 40);
          this.tweens.add({ targets: f, scaleY: 1.06, scaleX: 0.97, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          break;
        }
        case 'arena':
          this.arena = { rect: new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height), engaged: false, done: false, hitsAtStart: 0, walls: [] };
          break;
        case 'bouncepad':
          this.spawnPad(r.centerX, r.bottom, getProp(obj, 'style', 'dahlia'));
          break;
        case 'pig':
          this.spawnPig(r.centerX, r.bottom);
          break;
        case 'salmonthrow':
          this.spawnSalmonThrow(r.x, r.x + r.width, r.bottom, getProp(obj, 'apex', 4) * CONFIG.TILE, getProp(obj, 'phase', 0));
          break;
        case 'wheel':
          this.spawnWheel(r.centerX, r.centerY, getProp(obj, 'radius', 4) * CONFIG.TILE, getProp(obj, 'gondolas', 6), getProp(obj, 'carryGeoduck', -1));
          break;
        case 'door':
          this.zones.push({ kind: 'door', rect: new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height), obj });
          break;
        case 'pier':
          this.zones.push({ kind: 'pier', rect: new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height), obj });
          break;
        case 'flock':
          this.flock = new Flock(this, r.x, getProp(obj, 'speed', CONFIG.FLOCK.SPEED), getProp(obj, 'swoopers', CONFIG.FLOCK.SWOOPERS), this);
          break;
        case 'flashzone':
          this.flashZones.push({ rect: new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height), cooldownMs: 0 });
          break;
        case 'brick':
          this.blocks.add(new Brick(this, r.centerX, r.centerY, getProp(obj, 'style', 'brick')));
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
        case 'exit': {
          this.zones.push({ kind: 'exit', rect: new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height), obj });
          const vehicle = getProp<string>(obj, 'vehicle', 'bus');
          const vdef = VEHICLES[vehicle];
          if (vdef && this.textures.get('blocks').has(vehicle)) {
            // the boat / kayak / water taxi waits at the water's edge, its hull a little under the
            // surface; the hand truck and the elevator just stand there
            const v = this.add.image(r.centerX, r.bottom + vdef.sink, 'blocks', vehicle).setOrigin(0.5, 1).setDepth(vehicle === 'elevator' ? 3 : 11);
            if (vdef.sink > 0) this.tweens.add({ targets: v, y: v.y + 5, angle: 1.2, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            this.exitVehicle = v;
          }
          break;
        }
        case 'prop':
          spawnProp(this, obj);
          break;
        case 'player_spawn':
          break;
        default:
          console.warn(`[level] unsupported object type "${type}" at ${r.x},${r.y}`);
      }
    }
    // the goose waits in its arena
    if (this.arena) {
      for (const e of this.enemies.getChildren() as Enemy[]) {
        if (e instanceof CanadaGoose && Phaser.Geom.Rectangle.Contains(this.arena.rect, e.x, e.y - 10)) this.arena.boss = e;
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

    this.updateSurfaces();
    const padUnder = this.padUnderFeet();
    this.player.fixedUpdate(this.input_, dtMs);
    // jumping off a bounce pad you're standing on is the big launch (sprint-jump off the scooter)
    if (padUnder && this.input_.justPressed('jump') && this.player.body.velocity.y < 0) {
      this.player.launch(padUnder.big, true);
      AudioManager.sfx('boing');
    }
    if (this.player.fsm !== 'Dead' && this.player.body.top > this.level.heightPx + 40) this.player.die();

    const ctx = this.enemyContext(dtMs);
    for (const e of this.enemies.getChildren() as Enemy[]) e.fixedUpdate(ctx);
    this.updateMovers(dtMs);
    this.updatePig(dtMs);
    for (const rd of this.riders) {
      if (!rd.img.active) continue;
      rd.img.x = rd.ride.body.center.x;
      rd.img.y = rd.ride.body.top + rd.dy;
      const body = (rd.img as unknown as { body?: Phaser.Physics.Arcade.Body }).body;
      body?.reset(rd.img.x, rd.img.y);
    }
    this.flock?.fixedUpdate(this.player, dtMs, this.ending);
    // gum wall: pressing into it while falling turns the fall into a slow slide
    if (this.player.wallSlide && this.player.body.velocity.y > CONFIG.GUM_SLIDE_SPEED) this.player.body.setVelocityY(CONFIG.GUM_SLIDE_SPEED);
    for (const ss of this.seesaws) ss.fixedUpdate(dtMs);
    this.updateWater();
    this.updateArena();
    this.updateFlashes(dtMs);
    for (const u of this.powerups.getChildren() as PowerUp[]) u.fixedUpdate();
    for (const d of this.raindrops.getChildren() as RainDrop[]) d.fixedUpdate(dtMs);

    if (this.player.fsm !== 'Dead') this.checkZones();
    this.player.lastVy = this.player.body.velocity.y;

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
      if (z.kind === 'door' && this.input_.justPressed('down') && this.player.grounded) {
        this.enterDoor(getProp(z.obj, 'target', 'start'));
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


  // --- 1-2 / 1-3 mechanisms ------------------------------------------------------------------

  private enemyContext(dtMs: number): EnemyContext {
    return {
      player: this.player,
      cameraCenterX: this.cameras.main.midPoint.x,
      worldHeight: this.level.heightPx,
      dtMs,
      solidAt: (x, y) => this.solidAt(x, y),
      puff: (x, y) => this.puff(x, y),
      others: () => this.enemies.getChildren() as Enemy[],
      slime: (x, y) => this.dropSlime(x, y),
      dropGeoduck: (index, x, y) => {
        if (!this.run.geoducksFound[index]) this.geoducks.add(new Geoduck(this, x, y, index));
      },
      bossDefeated: (boss) => this.bossDefeated(boss),
      stealLattes: (l, t, r, b) => {
        for (const lt of this.lattes.getChildren() as Latte[]) {
          if (lt.x > l && lt.x < r && lt.y > t && lt.y < b) {
            this.puff(lt.x, lt.y);
            lt.destroy();
            if (Math.abs(lt.x - this.cameras.main.midPoint.x) < CONFIG.WIDTH / 2) AudioManager.sfx('caw');
          }
        }
      },
      shake: (ms, intensity) => {
        if (!Save.get().options.reduceMotion) this.cameras.main.shake(ms, intensity);
      },
    };
  }

  /** Canal / Sound water: drawn in front of Jimothy, deadly below the foam line. */
  private spawnWater(x: number, y: number, w: number, h: number, style: string): void {
    const key = style === 'dusk' ? 'bg:water_dusk' : 'bg:water';
    if (this.textures.exists(key)) {
      const ts = this.add.tileSprite(x, y, w, Math.max(h, 64), key).setOrigin(0, 0).setDepth(12).setAlpha(0.94);
      ts.tilePositionX = x * 0.5;
      this.tweens.add({ targets: ts, y: y + 4, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.waters.push({ rect: new Phaser.Geom.Rectangle(x, y, w, h) });
  }

  private waterAt(x: number): Water | undefined {
    return this.waters.find((wt) => x >= wt.rect.left && x <= wt.rect.right);
  }

  private splash(x: number, y: number): void {
    AudioManager.sfx('splash');
    for (const dx of [-18, 0, 18]) {
      const d = this.add.image(x + dx, y, 'blocks', 'raindrop').setDepth(13).setScale(1.4);
      this.tweens.add({ targets: d, y: y - 50 - Math.abs(dx), x: x + dx * 2.5, alpha: 0, duration: 420, ease: 'Quad.out', onComplete: () => d.destroy() });
    }
  }

  /** Leaping salmon: hides under the water, leaps, holds 1.2 s as a platform, drops back. */
  private spawnSalmon(x: number, top: number, rest: number, phaseMs: number, dir: number): void {
    const S = CONFIG.SALMON;
    const legs: MoverLeg[] = [
      { to: 0, ms: S.UNDER_MS },
      { to: 1, ms: S.RISE_MS, ease: easeOut },
      { to: 1, ms: S.HOLD_MS },
      { to: 0, ms: S.FALL_MS, ease: easeIn },
    ];
    const fish = new Mover(this, x, top - 14, rest, 'salmon', legs, phaseMs);
    fish.setDepth(7).setFlipX(dir < 0);
    this.moverGroup.add(fish);
    fish.body.setImmovable(true);
    fish.body.setAllowGravity(false);
    fish.body.setSize(108, 20, false).setOffset((fish.width - 108) / 2, 14);
    fish.body.checkCollision.down = false;
    fish.body.checkCollision.left = false;
    fish.body.checkCollision.right = false;
    fish.onLeg = (_leg, i) => {
      const surface = this.waterAt(x)?.rect.y ?? rest;
      const near = Math.abs(x - this.cameras.main.midPoint.x) < CONFIG.WIDTH;
      if (i === 1 && near) this.splash(x, surface);
      if (i === 0 && near) this.puff(x, surface);
    };
    this.movers.push(fish);
  }

  /** Ballard Locks gate: rises out of its slot to block the quay, sinks to let you pass. */
  private spawnLockGate(x: number, top: number, w: number, h: number, travelTiles: number, phaseMs: number): void {
    const G = CONFIG.LOCKGATE;
    const legs: MoverLeg[] = [
      { to: 1, ms: G.UP_MS },
      { to: 0, ms: G.MOVE_MS, ease: easeInOut },
      { to: 0, ms: G.DOWN_MS },
      { to: 1, ms: G.MOVE_MS, ease: easeInOut },
    ];
    const gate = new Mover(this, x, top, top + travelTiles * CONFIG.TILE, 'lockgate', legs, phaseMs);
    gate.setDisplaySize(w, h).setDepth(3);
    this.moverGroup.add(gate);
    gate.body.setImmovable(true);
    gate.body.setAllowGravity(false);
    gate.onLeg = (_leg, i) => {
      if ((i === 1 || i === 3) && Math.abs(x - this.cameras.main.midPoint.x) < CONFIG.WIDTH) AudioManager.sfx('brick');
    };
    this.movers.push(gate);
    this.gates.push(gate);
  }

  private updateMovers(dtMs: number): void {
    const pb = this.player.body;
    const alive = this.player.fsm !== 'Dead' && pb.enable;
    for (const m of this.movers) {
      m.fixedUpdate(dtMs);
      const mb = m.body;
      const across = pb.right > mb.left + 4 && pb.left < mb.right - 4;
      // Rising: carry whoever stands on top. A fast salmon or gate can otherwise outrun Arcade's
      // separation and slide straight through Jimothy (or fling him on the way).
      if (!mb.enable) continue;
      if (alive && across && mb.velocity.y < 0 && pb.velocity.y >= mb.velocity.y - 40 && pb.bottom >= mb.top - 10 && pb.top < mb.top + Math.max(28, mb.height / 2)) {
        pb.y = mb.top - pb.height;
        pb.velocity.y = mb.velocity.y;
      }
      // Standing on something that moves sideways (thrown salmon, gondolas): move with it.
      if (alive && across && mb.velocity.x !== 0 && Math.abs(pb.bottom - mb.top) <= 6 && pb.velocity.y >= mb.velocity.y - 40) {
        pb.x += mb.velocity.x * (dtMs / 1000);
      }
      if (!(m instanceof Mover) || !this.gates.includes(m) || mb.velocity.y <= 0) continue;
      // a sinking gate never squashes Jimothy: it waits while he's underneath it
      const gb = m.body;
      const under = pb.right > gb.left + 4 && pb.left < gb.right - 4 && pb.top >= gb.bottom - 8 && pb.top < gb.bottom + 40;
      if (under) {
        m.holdMs = 120;
        gb.setVelocityY(0);
      }
    }
  }

  // --- World 2 mechanisms ---------------------------------------------------------------------

  /** Dahlia bucket or tipped e-scooter: land on it to bounce; hold jump for the big one. */
  private spawnPad(x: number, bottom: number, style: string): void {
    const frame = this.textures.get('blocks').has(style) ? style : 'dahlia';
    const img = this.padGroup.create(x, bottom, 'blocks', frame) as Phaser.Physics.Arcade.Image;
    img.setOrigin(0.5, 1).setDepth(5).refreshBody();
    const b = img.body as Phaser.Physics.Arcade.StaticBody;
    const h = 20;
    b.setSize(img.width * 0.8, h, false).setOffset(img.width * 0.1, img.height * (style === 'dahlia' ? 0.18 : 0.35));
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    const scooter = frame === 'scooter_pad';
    this.pads.push({ img, big: scooter ? CONFIG.BOUNCE.SCOOTER : CONFIG.BOUNCE.DAHLIA, soft: scooter ? CONFIG.BOUNCE.SCOOTER_SOFT : CONFIG.BOUNCE.DAHLIA_SOFT });
  }

  private padUnderFeet(): Pad | undefined {
    const pb = this.player.body;
    if (!this.player.lastGrounded) return undefined;
    return this.pads.find((q) => {
      const b = q.img.body as Phaser.Physics.Arcade.StaticBody;
      return pb.right > b.left && pb.left < b.right && pb.bottom >= b.top - 4 && pb.bottom <= q.img.y + 2;
    });
  }

  private landOnPad(img: Phaser.Physics.Arcade.Image): void {
    const p = this.player;
    if (!p.body.touching.down || p.lastVy < CONFIG.BOUNCE.MIN_LAND_VY) return;
    const pad = this.pads.find((q) => q.img === img);
    if (!pad) return;
    const held = this.input_.get('jump');
    p.launch(held ? pad.big : pad.soft, held);
    AudioManager.sfx('boing');
    Haptics.pulse('stomp');
    this.tweens.add({ targets: img, scaleY: 0.82, scaleX: 1.08, duration: 90, yoyo: true, ease: 'Quad.out' });
  }

  /** The brass pig: stand on it for 3 s and it oinks out 10 lattes. */
  private spawnPig(x: number, bottom: number): void {
    const img = this.statics.create(x, bottom, 'blocks', 'pig') as Phaser.Physics.Arcade.Image;
    img.setOrigin(0.5, 1).setDepth(5).refreshBody();
    const b = img.body as Phaser.Physics.Arcade.StaticBody;
    b.setSize(img.width * 0.78, img.height * 0.62, false).setOffset(img.width * 0.1, img.height * 0.38);
    this.pig = { img, standMs: 0, done: false };
  }

  private updatePig(dtMs: number): void {
    const pig = this.pig;
    if (!pig || pig.done) return;
    const pb = this.player.body;
    const top = (pig.img.body as Phaser.Physics.Arcade.StaticBody).top;
    const on = this.player.lastGrounded && Math.abs(pb.bottom - top) < 6 && pb.right > pig.img.x - pig.img.width / 2 && pb.left < pig.img.x + pig.img.width / 2;
    pig.standMs = on ? pig.standMs + dtMs : 0;
    if (pig.standMs < CONFIG.PIG.STAND_MS) return;
    pig.done = true;
    AudioManager.sfx('oink');
    this.tweens.add({ targets: pig.img, scaleX: 1.06, scaleY: 0.94, duration: 110, yoyo: true, repeat: 2 });
    // ten lattes arc out of its mouth and land in a row to the right
    const mouthX = pig.img.x + pig.img.width * 0.42;
    const mouthY = top + 20;
    for (let i = 0; i < CONFIG.PIG.LATTES; i++) {
      const tx = mouthX + 60 + i * 44;
      const ty = top + pig.img.height * 0.62 - 40;
      const l = new Latte(this, mouthX, mouthY);
      this.lattes.add(l);
      this.tweens.addCounter({
        from: 0, to: 1, duration: 500 + i * 60,
        onUpdate: (tw) => {
          if (!l.active) return;
          const u = tw.getValue() ?? 1;
          l.setPosition(mouthX + (tx - mouthX) * u, mouthY + (ty - mouthY) * u - 140 * 4 * u * (1 - u));
          (l.body as Phaser.Physics.Arcade.Body | null)?.reset(l.x, l.y);
        },
      });
    }
  }

  /** Two fishmongers lob a salmon back and forth; ride it across. */
  private spawnSalmonThrow(ax: number, bx: number, bottom: number, apexPx: number, phaseMs: number): void {
    const S = CONFIG.SALMON_THROW;
    const handY = bottom - 150 + 30;
    const left = this.add.image(ax, bottom, 'blocks', 'fishmonger_throw').setOrigin(0.5, 1).setDepth(3);
    const right = this.add.image(bx, bottom, 'blocks', 'fishmonger_catch').setOrigin(0.5, 1).setDepth(3).setFlipX(true);
    const fish = new PathMover(this, 'salmon', throwPath(ax + 40, bx - 40, handY, apexPx, S.FLY_MS, S.HOLD_MS), phaseMs, 108, 20, 14);
    fish.setDepth(7);
    fish.onShow = (visible, p) => {
      // whoever is about to throw takes the throwing pose
      const thrower = p.x < (ax + bx) / 2 ? left : right;
      const catcher = thrower === left ? right : left;
      if (visible) {
        thrower.setFrame('fishmonger_throw');
        catcher.setFrame('fishmonger_catch');
        if (Math.abs(p.x - this.cameras.main.midPoint.x) < CONFIG.WIDTH) AudioManager.sfx('whoosh');
      }
    };
    this.moverGroup.add(fish);
    fish.body.setAllowGravity(false);
    fish.body.setImmovable(true);
    this.movers.push(fish);
  }

  /** The Great Wheel: gondola roofs are platforms going round. */
  private spawnWheel(cx: number, cy: number, r: number, count: number, carryGeoduck: number): void {
    if (this.textures.get('props').has('wheel')) {
      const w = this.add.image(cx, cy, 'props', 'wheel').setDepth(1);
      // the art's hub sits ~41% down its height
      const scale = (r * 2.3) / w.width;
      w.setScale(scale).setOrigin(0.5, 0.41).setPosition(cx, cy);
    }
    for (let i = 0; i < count; i++) {
      const g = new PathMover(this, 'gondola', wheelPath(cx, cy, r, CONFIG.WHEEL_PERIOD_MS, (i / count) * Math.PI * 2), 0, 84, 16, 2);
      g.setDepth(4);
      this.moverGroup.add(g);
      g.body.setAllowGravity(false);
      g.body.setImmovable(true);
      this.movers.push(g);
      if (i === 0 && carryGeoduck >= 0 && !this.run.geoducksFound[carryGeoduck]) {
        const d = new Geoduck(this, g.x, g.y - 30, carryGeoduck);
        this.geoducks.add(d);
        this.riders.push({ img: d, ride: g, dy: -30 });
      }
    }
  }

  /** FlockHost: a gull peels off the flock and swoops ahead, faster than you run. */
  spawnSwooper(x: number, y: number): void {
    const gull = new Seagull(this, x, y, { properties: { swoop: true, dir: 1, speedMul: CONFIG.FLOCK.SWOOP_SPEED_MUL } });
    this.enemies.add(gull);
  }

  /** FlockHost: caught — the flock takes the power-up (or a latte tax when he has none). */
  flockCaught(): void {
    AudioManager.sfx('squawk');
    if (this.player.stripPower()) {
      this.toast('SQUAWK!');
      return;
    }
    const lost = Math.min(this.run.lattes, CONFIG.FLOCK.LATTE_TAX);
    this.run.lattes -= lost;
    this.player.knockback(1, 380);
    this.toast(lost > 0 ? `-${lost} ☕` : 'SQUAWK!');
    this.pushHud();
  }

  /** FlockHost: piers are safe — the flock hovers while you're out on one. */
  onPier(x: number): boolean {
    const y = this.player.y;
    return this.zones.some((z) => z.kind === 'pier' && x >= z.rect.left && x <= z.rect.right && y >= z.rect.top && y <= z.rect.bottom + 4);
  }

  private enterDoor(target: string): void {
    const spot = this.level.spawns.get(target);
    if (!spot || this.ending) return;
    this.ending = true;
    AudioManager.sfx('drain');
    this.player.body.setVelocity(0, 0);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.teleport(spot.x, spot.y);
      this.cameras.main.fadeIn(300, 0, 0, 0);
      this.ending = false;
    });
  }

  private touchBonfire(f: Phaser.Physics.Arcade.Image): void {
    const p = this.player;
    if (p.fsm === 'Dead' || p.invulnerable) return;
    if (p.hurt()) p.knockback(p.x < f.x ? -1 : 1, CONFIG.BONFIRE_KNOCKBACK);
  }

  private dropSlime(x: number, feetY: number): void {
    if (!this.textures.get('blocks').has('slime')) return;
    const img = this.add.image(x, feetY + 2, 'blocks', 'slime').setOrigin(0.5, 1).setDepth(6).setAlpha(0.85).setScale(0.8, 0.7);
    this.slimes.push({ img, x, y: feetY, bornMs: this.timeMs });
    if (this.slimes.length > CONFIG.SLIME.MAX) this.slimes.shift()?.img.destroy();
  }

  /** Slime, sand and potholes under Jimothy's feet set his friction for this step. */
  private updateSurfaces(): void {
    const p = this.player;
    // slime dries up
    while (this.slimes.length && this.timeMs - this.slimes[0].bornMs > CONFIG.SLIME.LIFE_MS) {
      const old = this.slimes.shift()!;
      const img = old.img;
      this.tweens.add({ targets: img, alpha: 0, duration: 400, onComplete: () => img.destroy() });
    }
    // the gum wall: falling while pushing into a sticky tile
    p.wallSlide = false;
    if (!p.lastGrounded && p.body.velocity.y > 0) {
      const dir = this.input_.axisX();
      const midY = p.body.center.y;
      const sideX = dir < 0 ? p.body.left - 3 : dir > 0 ? p.body.right + 3 : NaN;
      if (!Number.isNaN(sideX)) p.wallSlide = Boolean(this.level.ground.getTileAtWorldXY(sideX, midY)?.properties?.sticky);
    }
    if (!p.lastGrounded) {
      p.onSlime = false;
      p.onSand = false;
      return;
    }
    const feet = p.body.bottom;
    const hz = this.level.hazards?.getTileAtWorldXY(p.x, feet - 2);
    p.onSlime = hz?.properties?.hazard === 'gum' || this.slimes.some((sl) => Math.abs(sl.x - p.x) < 44 && Math.abs(sl.y - feet) < 12);
    const t = this.level.ground.getTileAtWorldXY(p.x, feet + 4);
    p.onSand = t?.properties?.surface === 'sand';
  }

  private updateWater(): void {
    if (this.waters.length === 0) return;
    const p = this.player;
    if (p.fsm !== 'Dead') {
      const w = this.waterAt(p.x);
      if (w && p.body.bottom > w.rect.y + CONFIG.WATER_SINK_PX && p.body.top < w.rect.bottom) {
        this.splash(p.x, w.rect.y + 6);
        p.die();
      }
    }
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.alive || !e.body?.enable) continue;
      const w = this.waterAt(e.x);
      if (w && e.body.bottom > w.rect.y + CONFIG.WATER_SINK_PX + 10 && e.body.allowGravity) {
        this.splash(e.x, w.rect.y + 6);
        e.destroy();
      }
    }
  }

  private updateArena(): void {
    const a = this.arena;
    if (!a || a.done || a.engaged || !a.boss?.alive) return;
    if (this.player.x > a.rect.x + CONFIG.TILE * 3 && this.player.fsm !== 'Dead') this.engageArena(a);
  }

  private engageArena(a: Arena): void {
    a.engaged = true;
    a.hitsAtStart = this.player.hitsTaken;
    const T = CONFIG.TILE;
    for (const wx of [a.rect.left, a.rect.right - T]) {
      const zone = this.add.zone(wx + T / 2, this.level.heightPx / 2, T, this.level.heightPx);
      this.walls.add(zone);
      a.walls.push(zone);
      // a driftwood barricade drops in where the wall is
      for (let i = 0; i < 3; i++) {
        const pile = this.add.image(wx + T / 2, this.groundYAt(wx + T / 2) - i * 80, 'blocks', 'logpile').setOrigin(0.5, 1).setDepth(6).setScale(0.82);
        pile.y -= 600;
        this.tweens.add({ targets: pile, y: pile.y + 600, duration: 380, delay: i * 90, ease: 'Bounce.out' });
        a.walls.push(pile);
      }
    }
    if (!Save.get().options.reduceMotion) this.cameras.main.shake(250, 0.006);
    AudioManager.music('goose');
    a.boss?.wake();
    bus.emit(EV.HUD_BOSS, { name: 'CANADA GOOSE', hp: a.boss?.hp ?? 3, max: a.boss?.def.hp ?? 3 });
  }

  private groundYAt(x: number): number {
    for (let y = 0; y < this.level.heightPx; y += CONFIG.TILE) {
      const t = this.level.ground.getTileAtWorldXY(x, y + 1);
      if (t && t.collides) return y;
    }
    return this.level.heightPx;
  }

  private bossDefeated(boss: Enemy): void {
    const a = this.arena;
    bus.emit(EV.HUD_BOSS, null);
    this.toast('HONK.');
    AudioManager.music(this.level.music);
    if (!a) return;
    a.done = true;
    for (const w of a.walls) {
      if (w instanceof Phaser.GameObjects.Zone) {
        this.walls.remove(w, true, true);
        continue;
      }
      this.tweens.add({ targets: w, alpha: 0, y: '+=40', duration: 500, onComplete: () => w.destroy() });
    }
    a.walls = [];
    // Loyalty Star drops where the goose stood
    this.powerups.add(new PowerUp(this, boss.x, boss.y - 60, 'star', false));
    // the third geoduck for a clean fight (the hidden arena block is the fallback)
    if (this.player.hitsTaken === a.hitsAtStart && !this.run.geoducksFound[2]) {
      this.geoducks.add(new Geoduck(this, a.rect.centerX, a.rect.y + CONFIG.TILE * 6, 2));
      this.toast('Not a scratch!');
    }
  }

  /** Herschel's fans: camera flashes popping around the joke screen. */
  private updateFlashes(dtMs: number): void {
    for (const z of this.flashZones) {
      if (!Phaser.Geom.Rectangle.Contains(z.rect, this.player.x, this.player.y - 10)) continue;
      z.cooldownMs -= dtMs;
      if (z.cooldownMs > 0) continue;
      z.cooldownMs = CONFIG.CAMERA_FLASH_MS * Phaser.Math.FloatBetween(0.6, 1.4);
      const fx = Phaser.Math.Between(z.rect.left, z.rect.right);
      const fy = Phaser.Math.Between(z.rect.top, z.rect.bottom);
      const flash = this.add.image(fx, fy, 'blocks', 'sparkle').setDepth(13).setScale(0.3).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: flash, scale: 0.9, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
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
      const hpBefore = enemy.hp;
      if (enemy.onStomp(this.enemyContext(0))) this.player.bounce(this.input_.get('jump'));
      if (enemy.isBoss && enemy.hp !== hpBefore && enemy.alive) bus.emit(EV.HUD_BOSS, { name: 'CANADA GOOSE', hp: enemy.hp, max: enemy.def.hp });
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
      const index = item.startsWith('geoduck:') ? Number(item.slice(8)) || 0 : 2;
      if (this.run.geoducksFound[index]) {
        // already have that one: a burst of lattes instead
        this.addLattes(CONFIG.LATTE_BLOCK_BURST * 5);
        return;
      }
      this.geoducks.add(new Geoduck(this, x, y - CONFIG.TILE, index));
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
    const v = this.exitVehicle;
    if (v) {
      // hop aboard, then drift off to the right
      this.tweens.killTweensOf(v);
      this.player.body.enable = false;
      const vdef = VEHICLES[vehicle] ?? VEHICLES.boat;
      const deckY = v.y - v.height * vdef.deck;
      this.tweens.add({
        targets: this.player, x: v.x - 10, y: deckY, duration: 450, ease: 'Quad.out',
        onComplete: () => {
          AudioManager.sfx(vehicle === 'elevator' ? 'ding' : 'ticket');
          if (vdef.leave === 'down') {
            // the elevator takes him down to the waterfront
            this.tweens.add({ targets: this.player, y: deckY + 80, alpha: 0, duration: 900, ease: 'Sine.in' });
            this.cameras.main.fadeOut(1200, 0, 0, 0);
            this.time.delayedCall(1300, () => this.finishLevel(totalMs));
            return;
          }
          this.tweens.add({ targets: [v, this.player], x: `+=${CONFIG.WIDTH}`, duration: CONFIG.EXIT_BOAT_MS, ease: 'Sine.in', onComplete: () => this.finishLevel(totalMs) });
        },
      });
      return;
    }
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
