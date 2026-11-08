import Phaser from 'phaser';

export const FONT_DISPLAY = '"Fredoka", "Baloo 2", "Nunito", "Trebuchet MS", "Segoe UI", sans-serif';
export const FONT_BODY = '"Nunito", "Fredoka", "Trebuchet MS", "Segoe UI", sans-serif';

export const COLORS = {
  ink: '#1C2426',
  paper: '#F4EFE6',
  amber: '#F2B35B',
  coral: '#FF6F61',
  mist: '#B8C9CE',
  moss: '#5E8C5A',
  cedar: 0x1f3a33,
  paperHex: 0xf4efe6,
  amberHex: 0xf2b35b,
};

interface TextOpts {
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  wordWrapWidth?: number;
  display?: boolean;
  stroke?: boolean;
}

export function uiText(scene: Phaser.Scene, x: number, y: number, text: string, opts: TextOpts = {}): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, {
    fontFamily: opts.display === false ? FONT_BODY : FONT_DISPLAY,
    fontSize: `${opts.fontSize ?? 24}px`,
    color: opts.color ?? COLORS.paper,
    align: opts.align ?? 'left',
    fontStyle: 'bold',
    wordWrap: opts.wordWrapWidth ? { width: opts.wordWrapWidth } : undefined,
  });
  if (opts.stroke !== false) t.setStroke(COLORS.ink, Math.max(2, Math.round((opts.fontSize ?? 24) / 8)));
  t.setResolution(2);
  return t;
}
