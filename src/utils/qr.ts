import QRCode from 'qrcode';

const QUIET_ZONE = 4;

export interface QRCodePath {
  path: string;
  viewBoxSize: number;
}

export function createQRCodePath(value: string): QRCodePath | null {
  if (!value) return null;

  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const modules = qr.modules;
    const commands: string[] = [];

    for (let row = 0; row < modules.size; row += 1) {
      let column = 0;

      while (column < modules.size) {
        if (!modules.get(row, column)) {
          column += 1;
          continue;
        }

        const runStart = column;
        while (column < modules.size && modules.get(row, column)) {
          column += 1;
        }

        const x = runStart + QUIET_ZONE;
        const y = row + QUIET_ZONE;
        commands.push(`M${x} ${y}h${column - runStart}v1H${x}z`);
      }
    }

    return {
      path: commands.join(''),
      viewBoxSize: modules.size + QUIET_ZONE * 2,
    };
  } catch {
    return null;
  }
}
