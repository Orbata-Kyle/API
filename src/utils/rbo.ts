/**
 * This calculates the Rank Biased Overlap(RBO) for two sorted lists.
 *
 * Based on "A Similarity Measure for Indefinite Rankings" William Webber, Alistair Moffat,
 * and Justin Zobel (Nov 2010).
 *
 * For more information, read
 *  http://www.williamwebber.com/research/papers/wmz10_tois.pdf
 *
 * Based on the reference by Damian Gryski in Golang available from
 *  https://github.com/dgryski
 *
 * @license Licensed under the MIT license.
 *
 * @author Dag Holmberg
 * https://github.com/holmberd
 */
export class RBO {
  p: number;
  rbo: number;
  depth: number;
  overlap: number;
  shortDepth: number;
  seen: Map<number, boolean>;
  wgt: number;
  shortOverlap: number;

  constructor(p: number) {
    this.p = p;
    this.rbo = 0;
    this.depth = 0;
    this.overlap = 0;
    this.shortDepth = -1;
    this.seen = new Map();
    this.wgt = (1 - p) / p;
    this.shortOverlap = -1;
  }

  calcWeight(p: number, d: number) {
    let summa = 0;
    for (let i = 1; i < d; i++) {
      summa += Math.pow(p, i) / i;
    }
    return (
      1 -
      Math.pow(p, d - 1) +
      ((1 - p) / p) * d * (Math.log(1 / (1 - p)) - summa)
    );
  }

  calculate(s: any[], t: any[]) {
    if (t.length < s.length) {
      const _t = s;
      s = t;
      t = _t;
    }
    for (let i = 0, l = s.length; i < l; i++) {
      this.update(s[i], t[i]);
    }
    this.endShort();
    if (t.length > s.length) {
      for (let n = s.length, le = t.length; n < le; n++) {
        this.updateUneven(t[n]);
      }
    }
    return this.calcExtrapolated();
  }

  update(e1, e2) {
    if (this.shortDepth != -1) {
      return false;
    }
    if (e1 == e2) {
      this.overlap++;
    } else {
      if (this.seen.has(e1)) {
        this.seen.set(e1, false);
        this.overlap++;
      } else {
        this.seen.set(e1, true);
      }

      if (this.seen.has(e2)) {
        this.seen.set(e2, false);
        this.overlap++;
      } else {
        this.seen.set(e2, true);
      }
    }
    this.depth++;
    this.wgt *= this.p;
    this.rbo += (this.overlap / this.depth) * this.wgt;
  }

  calcExtrapolated() {
    const pl = Math.pow(this.p, this.depth);
    if (this.shortDepth == -1) {
      this.endShort();
    }
    return (
      this.rbo +
      ((this.overlap - this.shortOverlap) / this.depth +
        this.shortOverlap / this.shortDepth) *
        pl
    );
  }

  endShort() {
    this.shortDepth = this.depth;
    this.shortOverlap = this.overlap;
  }

  updateUneven(e) {
    if (this.shortDepth == -1) {
      console.log('RBO: UpdateUneven() called without EndShort()');
      return false;
    }
    if (this.seen[e]) {
      this.overlap++;
      this.seen[e] = false;
    }
    this.depth++;
    this.wgt *= this.p;
    this.rbo += (this.overlap / this.depth) * this.wgt;
    this.rbo +=
      ((this.shortOverlap * (this.depth - this.shortDepth)) /
        (this.depth * this.shortDepth)) *
      this.wgt;
  }
}
