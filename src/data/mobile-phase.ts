// data/mobile-phases.ts
export interface MobilePhase {
  srNo: number;
  code: string;
  baseSolvent: string;
  description: string;
}

export const MOBILE_PHASES: MobilePhase[] = [
  {
    srNo: 1,
    code: "MP01",
    baseSolvent: "Water",
    description: ""
  },
  {
    srNo: 2,
    code: "MP02",
    baseSolvent: "Methanol",
    description: ""
  },
  {
    srNo: 3,
    code: "MP03",
    baseSolvent: "Acetonitrile",
    description: ""
  },
  {
    srNo: 4,
    code: "MP04",
    baseSolvent: "Buffer (Ammonium formate)",
    description: "1.26 g Ammonium formate in 1000 ml water & adjust pH 5.6 with OPA"
  },
  {
    srNo: 5,
    code: "MP05",
    baseSolvent: "Buffer (Ammonium acetate)",
    description: "3.0 g Ammonium acetate & 1.0 g Ammonium chloride in 760 ml water, add 5 ml tetrahydrofuran, add 240 ml Acetonitrile, mix & filter (0.45 µm membrane filter)"
  },
  {
    srNo: 6,
    code: "MP06",
    baseSolvent: "Buffer (Potassium chloride with borax)",
    description: "1.4 g Potassium chloride – 9.19 mg borax – 540 mg dextrose – 11.74 mg boric acid in 1000 ml water, mix & dissolve, filter with membrane holder"
  }
];