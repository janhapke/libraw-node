// Ported verbatim from photoview's `tests/fixtures/TiffIfdWriter.ts` (same
// repo author) for @janhapke/libraw's synthetic DNG fixture generator (T04).
// See `test/fixtures/README.md` for the fixture this supports and
// `/home/jan/dev/_jdd/knowledge-base/dng-generation.md` for the byte-layout
// design this implements.
//
// A small, reusable TIFF/DNG IFD writer: layout + serialization of tag
// entries, byte offsets, and the overflow area for values that don't fit
// inline in a 4-byte IFD entry slot.

export enum TiffType {
    BYTE = 1,
    ASCII = 2,
    SHORT = 3,
    LONG = 4,
    RATIONAL = 5,
    SRATIONAL = 10,
}

export type TiffValue = number[] | string | Array<[number, number]> | null;

export interface TiffEntrySpec {
    tag: number;
    type: TiffType;
    values: TiffValue; // null = LONG, count 1 placeholder — patched later via `patches`
}

interface ResolvedTiffEntry {
    tag: number;
    type: TiffType;
    count: number;
    inline: Buffer | null;
    overflowOffset: number | null;
}

export interface IfdLayout {
    resolved: ResolvedTiffEntry[];
    overflow: Buffer;
    tableSize: number;
}

function packValue(type: TiffType, values: number[] | string | Array<[number, number]>): Buffer {
    if (type === TiffType.ASCII) {
        return Buffer.concat([Buffer.from(values as string, 'ascii'), Buffer.from([0])]);
    }
    if (type === TiffType.BYTE) {
        return Buffer.from(values as number[]);
    }
    if (type === TiffType.SHORT) {
        const buf = Buffer.alloc((values as number[]).length * 2);
        (values as number[]).forEach((v, i) => buf.writeUInt16LE(v, i * 2));
        return buf;
    }
    if (type === TiffType.LONG) {
        const buf = Buffer.alloc((values as number[]).length * 4);
        (values as number[]).forEach((v, i) => buf.writeUInt32LE(v, i * 4));
        return buf;
    }
    if (type === TiffType.SRATIONAL) {
        const pairs = values as Array<[number, number]>;
        const buf = Buffer.alloc(pairs.length * 8);
        pairs.forEach(([num, denom], i) => {
            buf.writeInt32LE(num, i * 8);
            buf.writeInt32LE(denom, i * 8 + 4);
        });
        return buf;
    }
    if (type === TiffType.RATIONAL) {
        const pairs = values as Array<[number, number]>;
        const buf = Buffer.alloc(pairs.length * 8);
        pairs.forEach(([num, denom], i) => {
            buf.writeUInt32LE(num, i * 8);
            buf.writeUInt32LE(denom, i * 8 + 4);
        });
        return buf;
    }
    throw new Error(`Unsupported TIFF type: ${type}`);
}

/**
 * Computes an IFD's table + overflow byte layout ahead of time. Entries whose `values`
 * is `null` are LONG/count-1 placeholders — always inline (4 bytes) regardless of their
 * eventual value, so they never affect layout size and can be patched in during
 * `serializeIfd` once dependent offsets (computed from this layout) are known.
 */
export function buildIfdLayout(entriesInOrder: TiffEntrySpec[], baseOffset: number): IfdLayout {
    const sorted = [...entriesInOrder].sort((a, b) => a.tag - b.tag);
    const tableSize = 2 + sorted.length * 12 + 4;
    const overflowStart = baseOffset + tableSize;

    const overflowChunks: Buffer[] = [];
    let overflowLength = 0;
    const resolved: ResolvedTiffEntry[] = [];

    for (const { tag, type, values } of sorted) {
        if (values === null) {
            resolved.push({ tag, type, count: 1, inline: null, overflowOffset: null });
            continue;
        }

        const data = packValue(type, values);
        const count = type === TiffType.ASCII ? data.length : (values as unknown[]).length;

        if (data.length <= 4) {
            const inline = Buffer.alloc(4);
            data.copy(inline);
            resolved.push({ tag, type, count, inline, overflowOffset: null });
        } else {
            const offset = overflowStart + overflowLength;
            overflowChunks.push(data);
            overflowLength += data.length;
            if (overflowLength % 2 !== 0) {
                overflowChunks.push(Buffer.from([0]));
                overflowLength += 1;
            }
            resolved.push({ tag, type, count, inline: null, overflowOffset: offset });
        }
    }

    return { resolved, overflow: Buffer.concat(overflowChunks, overflowLength), tableSize };
}

export function serializeIfd(
    layout: IfdLayout,
    nextIfdOffset: number,
    patches: Record<number, number> = {},
): Buffer {
    const chunks: Buffer[] = [];

    const count = Buffer.alloc(2);
    count.writeUInt16LE(layout.resolved.length, 0);
    chunks.push(count);

    for (const entry of layout.resolved) {
        const header = Buffer.alloc(8);
        header.writeUInt16LE(entry.tag, 0);
        header.writeUInt16LE(entry.type, 2);
        header.writeUInt32LE(entry.count, 4);
        chunks.push(header);

        let value: Buffer;
        if (entry.inline !== null) {
            value = entry.inline;
        } else if (entry.overflowOffset !== null) {
            value = Buffer.alloc(4);
            value.writeUInt32LE(entry.overflowOffset, 0);
        } else {
            value = Buffer.alloc(4);
            value.writeUInt32LE(patches[entry.tag], 0);
        }
        chunks.push(value);
    }

    const next = Buffer.alloc(4);
    next.writeUInt32LE(nextIfdOffset, 0);
    chunks.push(next);

    return Buffer.concat(chunks);
}
