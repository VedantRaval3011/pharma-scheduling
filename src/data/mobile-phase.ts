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
    description: "3.0 g Ammonium acetate & 1.0 g Ammonium chloride in 760 ml water and add 5 ml tetrahydrofuran and add 240 ml Acetonitrile and mix. Filter with 0.45 µm membrane filter."
  },
  {
    srNo: 6,
    code: "MP06",
    baseSolvent: "Buffer (Potassium chloride with borax)",
    description: "1.4 g Potassium chloride - 9.19 mg borax - 540 mg dextrose - 11.74 mg boric acid in 1000 ml water mix and dissolve and Filter with Membrane Holder."
  },
  {
    srNo: 7,
    code: "MP07",
    baseSolvent: "Buffer (Sodium 1-Octanesulfonate)",
    description: "2.18 mg/ml sodium 1-Octanesulfonate in water adjust 3.5 pH with OPA"
  },
  {
    srNo: 8,
    code: "MP08",
    baseSolvent: "Triethylamine 0.75",
    description: "Methanol:Water:Triethylamine (70:30:0.75) (First mix water and Triethylamine) adjust pH 3.25 with OPA"
  },
  {
    srNo: 9,
    code: "MP09",
    baseSolvent: "Buffer (OPA)",
    description: "5.0 ml Triethylamine in 1000 ml water & adjust pH 3.0 with OPA"
  },
  {
    srNo: 10,
    code: "MP10",
    baseSolvent: "Buffer (OPA)",
    description: "3.0 ml Triethylamine in 1000 ml water and adjust pH 3.0 OPA"
  },
  {
    srNo: 11,
    code: "MP11",
    baseSolvent: "Buffer (Tetrabutyl Ammonium Hydrogen Sulphate with Monobasic Potassium Phosphate)",
    description: "0.5 g Tetrabutyl Ammonium Hydrogen Sulphate and 1.0 g Monobasic potassium Phosphate in 1000 ml water and add 2 ml OPA"
  },
  {
    srNo: 12,
    code: "MP12",
    baseSolvent: "Buffer (Monobasic Potassium Phosphate)",
    description: "1.4 g/L of Monobasic Potassium Phosphate and adjust 3.0 pH with OPA"
  },
  {
    srNo: 13,
    code: "MP13",
    baseSolvent: "Buffer (Hexane Sulfonate Sodium)",
    description: "1.8822 g of 1-Hexane Sulfonate Sodium in 1000 ml water and adjust pH 3.0 with OPA"
  },
  {
    srNo: 14,
    code: "MP14",
    baseSolvent: "Buffer (hydroxymethyl aminomethane)",
    description: "2.0 g of Tris (hydroxymethyl) aminomethane in 800 ml water. Add 20 ml 1 N sulfuric acid and dilute with acetonitrile obtain 2000 ml solution. Cool and filter with 0.2 µm."
  },
  {
    srNo: 15,
    code: "MP15",
    baseSolvent: "Buffer (Potassium Dihydrogen Phosphate)",
    description: "1.36 gm Potassium Dihydrogen Phosphate in 1000 ml water and add 1 triethylamine. Adjust pH 3.5 with OPA. Filter with 0.45 µm membrane filter."
  },
  {
    srNo: 16,
    code: "MP16",
    baseSolvent: "Buffer (Orthophosphoric acid)",
    description: "1.4 ml Orthophosphoric acid in 1000 ml water and adjust pH 3.00 ± 0.05 with triethylamine."
  },
  {
    srNo: 17,
    code: "MP17",
    baseSolvent: "Buffer (Potassium Hydrogen Orthophosphate)",
    description: "0.05 M Potassium Hydrogen Orthophosphate adjust pH with 7.0 KOH"
  },
  {
    srNo: 18,
    code: "MP18",
    baseSolvent: "Buffer (Monobasic Potassium Phosphate)",
    description: "0.01 M Monobasic Potassium Phosphate in a mixture of methanol and Water (1:1)"
  },
  {
    srNo: 19,
    code: "MP19",
    baseSolvent: "Buffer (orthophosphoric acid)",
    description: "2.0 ml orthophosphoric acid in 1000 ml water and adjust pH 3.0 with Triethylamine."
  },
  {
    srNo: 20,
    code: "MP20",
    baseSolvent: "Buffer (Ammonium acetate)",
    description: "0.77 gm Ammonium acetate in 1000 ml water and add 1.0 ml Triethylamine and adjust pH 4.8 ± 0.05 with dilute glacial acetic acid."
  },
  {
    srNo: 21,
    code: "MP21",
    baseSolvent: "Buffer (Anhydrous Ammonium sulphate)",
    description: "2.5 gm of Anhydrous Ammonium sulphate in 1000 ml water. Adjust pH 2.7 with OPA."
  },
  {
    srNo: 22,
    code: "MP22",
    baseSolvent: "Buffer (Potassium Hydrogen Phosphate)",
    description: "6.8 gm of Potassium Hydrogen Phosphate in 1000 ml water and add 5 ml Triethylamine. Adjust pH 7.5 With 5 N Potassium Hydroxide and filter with 0.5 µm."
  },
  {
    srNo: 23,
    code: "MP23",
    baseSolvent: "Buffer (Monobasic Potassium Phosphate)",
    description: "13.6 gm of Monobasic Potassium Phosphate in 1000 ml water add 1.0 ml Triethylamine. Adjust pH 3.0 with OPA."
  },
  {
    srNo: 24,
    code: "MP24",
    baseSolvent: "Buffer (sodium di-Hydrogen ortho phosphate)",
    description: "23.996 gm of sodium di-Hydrogen ortho phosphate Anhydrous in 1000 ml water. Adjust pH 3.0 ± 0.1 with OPA."
  },
  {
    srNo: 25,
    code: "MP25",
    baseSolvent: "Buffer (Dibasic Ammonium Phosphate)",
    description: "660 mg Dibasic Ammonium Phosphate in 1000 ml water and adjust pH 3.0 ± 0.1 with OPA."
  },
  {
    srNo: 26,
    code: "MP26",
    baseSolvent: "Orthophosphoric Acid",
    description: "2.0 ml orthophosphoric acid in 1000 ml water."
  },
  {
    srNo: 27,
    code: "MP27",
    baseSolvent: "Buffer (sodium Phosphate)",
    description: "11.1 gm of Monobasic sodium Phosphate in 1000 ml water. Adjust pH 2.8 ± 0.05 with OPA."
  },
  {
    srNo: 28,
    code: "MP28",
    baseSolvent: "Glacial acetic acid 4.0 (Sodium Acetate)",
    description: "Methanol : Water : 1 M Sodium Acetate : Glacial acetic acid (60:46:10:4)"
  },
  {
    srNo: 29,
    code: "MP29",
    baseSolvent: "Buffer (Sodium Acetate with Triethylamine)",
    description: "6.8 gm/L of Sodium Acetate in 1000 ml water and add 3.5 ml Triethylamine and 6.6 ml Glacial Acetic Acid. Adjust pH 4.5 With Glacial Acetic Acid."
  },
  {
    srNo: 30,
    code: "MP30",
    baseSolvent: "Sodium Perchlorate",
    description: "14.9 gm of Sodium Perchlorate in 1000 ml water and adjust pH 4.5 with dilute Perchloric Acid."
  },
  {
    srNo: 31,
    code: "MP31",
    baseSolvent: "Buffer (Monobasic Potassium)",
    description: "4.08 gm Monobasic Potassium in 1000 ml water and adjust pH 4.5 ± 0.05 with 0.1 N Sodium Hydroxide Solution or 0.1 v/v Orthophosphoric acid. Filter with 0.45 µm membrane filter."
  },
  {
    srNo: 32,
    code: "MP32",
    baseSolvent: "Buffer (Monobasic Sodium Phosphate)",
    description: "6.9 g / L of Monobasic Sodium Phosphate in Water."
  },
  {
    srNo: 33,
    code: "MP33",
    baseSolvent: "Buffer (Ammonium Oxalate)",
    description: "Mix 680 ml of Ammonium Oxalate, 270 ml of Dimethyl Formamide and 50 ml of 0.2 M Disodium Ammonium Phosphate. Adjust pH 7.6 to 7.7 with 3 N Phosphoric Acid."
  },
  {
    srNo: 34,
    code: "MP34",
    baseSolvent: "Buffer (Phosphate)",
    description: "0.1 M Phosphate Buffer"
  },
  {
    srNo: 35,
    code: "MP35",
    baseSolvent: "Buffer (L solution of Tetrabutyl)",
    description: "27.2 g / L solution of Tetrabutyl Ammonium Hydrogen Sulfate"
  },
  {
    srNo: 36,
    code: "MP36",
    baseSolvent: "Glacial acetic acid 0.1",
    description: "Water:Methanol:Glacial acetic acid (55 : 45 : 0.1)."
  },
  {
    srNo: 37,
    code: "MP37",
    baseSolvent: "Buffer (Potassium Hydrogen Phosphate)",
    description: "2.72 g of Potassium Hydrogen Phosphate in 1000 ml water and Mix. Adjust 5.0 with OPA or Sodium Hydroxide."
  },
  {
    srNo: 38,
    code: "MP38",
    baseSolvent: "Buffer (Sodium Hydrogen Carbonate)",
    description: "0.2081 g of Sodium Hydrogen Carbonate and 0.0138 g of Sodium Carbonate in 2000 ml water. Adjust pH 6.0 with Dilute Sodium Hydroxide."
  },
  {
    srNo: 39,
    code: "MP39",
    baseSolvent: "Buffer (Monobasic Potassium Phosphate)",
    description: "3.0 g Monobasic Potassium Phosphate in 1000 ml water and add 3 ml of Triethylamine. Adjust pH 3.0 with OPA."
  },
  {
    srNo: 40,
    code: "MP40",
    baseSolvent: "Buffer (Methanol, Acetonitrile, Potassium Dihydrogen Phosphate)",
    description: "A Mixture of 2 Volume Methanol, 5 Volume Acetonitrile, 10 Volume of a 13.6% of Potassium Dihydrogen Phosphate and 83 Volume of water. Filter with Membrane filter (1-mm or final porosity)."
  },
  {
    srNo: 41,
    code: "MP41",
    baseSolvent: "Buffer (Triethylamine)",
    description: "7.0 ml Triethylamine, 3.0 ml of Glacial Acetic in 100 ml volumetric flask. Make up the volume with 100 ml water. Dilute 2.0 ml of this Solution to 1000 with water."
  },
  {
    srNo: 42,
    code: "MP42",
    baseSolvent: "Buffer (Sodium Perchlorate Monohydrate)",
    description: "3.45 g of Sodium Perchlorate Monohydrate and 12 ml OPA in 1000 ml water. Adjust pH 3.6 with Triethylamine and add 90 ml of Acetonitrile."
  },
  {
    srNo: 43,
    code: "MP43",
    baseSolvent: "Buffer (OPA)",
    description: "1 ml OPA in 1000 ml water and Adjust pH 3.0 with Triethylamine and Filter with 0.45 µm Membrane Filter."
  },
  {
    srNo: 44,
    code: "MP44",
    baseSolvent: "Buffer (Ammonium Dihydrogen Phosphate)",
    description: "8.57 g of Ammonium Dihydrogen Phosphate in 1000 ml water and adjust pH 3.0 with OPA."
  },
  {
    srNo: 45,
    code: "MP45",
    baseSolvent: "Buffer (Sodium Sulphate)",
    description: "14.21 g Sodium Sulphate in 1000 ml water"
  },
  {
    srNo: 46,
    code: "MP46",
    baseSolvent: "Buffer",
    description: "4.3 g of 1-octanesulphonic acid sodium salt (anhydrous) in 1000 mL of water. Adjust pH of the solution to 4.00 ± 0.01"
  },
  {
    srNo: 47,
    code: "MP47",
    baseSolvent: "Buffer",
    description: "Dissolve 1 ml of Orthophosphoric acid in a 1000 ml of purified water. Filter through 0.45 µ membrane filter."
  },
  {
    srNo: 48,
    code: "MP48",
    baseSolvent: "Buffer",
    description: "Dissolve accurately about 4.55 g of potassium dihydrogen phosphate in 1000 mL of water. Adjust pH of the solution to 7.50 ± 0.05 with 10% sodium hydroxide solution."
  },
  {
    srNo: 49,
    code: "MP49",
    baseSolvent: "Buffer",
    description: "A mixture of 10 volume of 3.484% w/v solution of dipotassium hydrogen phosphate previously adjusted to pH 6.5 with orthophosphoric acid, 35 volume of Acetonitrile and 55 volume of water"
  },
  {
    srNo: 50,
    code: "MP50",
    baseSolvent: "Buffer",
    description: "Take 0.5 ml trifluoroacetic acid dilute 1000 ml with water"
  },
  {
    srNo: 51,
    code: "MP51",
    baseSolvent: "Buffer",
    description: "1000 ml of 25 mM Ammonium acetate, add 2 ml of Triethylamine mix and adjust pH 4.8 with Acetic acid."
  },
  {
    srNo: 52,
    code: "MP52",
    baseSolvent: "Buffer",
    description: "5.6 gm/l of monobasic potassium phosphate and 22.2 gm/l of myristyltrimethylammonium bromide in water. Adjust with sodium hydroxide solution to a pH of 6.5."
  },
  {
    srNo: 53,
    code: "MP53",
    baseSolvent: "Buffer",
    description: "A solution containing 0.01 M sodium acetate and 0.005 M dioctyl sodium sulphosuccinate in methanol (60 per cent), adjusted to pH 5.5 with glacial acetic acid."
  },
  {
    srNo: 54,
    code: "MP54",
    baseSolvent: "Buffer",
    description: "Take 0.1 gm of orthophosphoric acid in 100 ml volumetric flask and dilute to volume with 100 ml Distilled water."
  },
  {
    srNo: 55,
    code: "MP55",
    baseSolvent: "Buffer",
    description: "Take 0.16 gm of Sodium dihydrogen phosphate in 100 ml volumetric flask and dilute to volume with 100 ml Distilled water"
  },
  {
    srNo: 56,
    code: "MP56",
    baseSolvent: "Buffer",
    description: "Dissolve 14.05 g of sodium perchlorate in 1000 mL of water & adjust pH of the solution to 4.50 ± 0.10 with dilute Perchloric acid."
  },
  {
    srNo: 57,
    code: "MP57",
    baseSolvent: "Buffer",
    description: "Dissolve 6.8 gm of Potassium dihydrogen orthophosphate in 900 mL of water, add 1 mL of Triethylamine and mix. Adjust the pH to 2.5 with orthophosphoric acid and dilute to 1000 mL with water. Filter and degas before use."
  },
  {
    srNo: 58,
    code: "MP58",
    baseSolvent: "Buffer",
    description: "Dissolve 6.80 gm of Potassium dihydrogen phosphate in 1000ml of water and adjust to pH 4.0 with Orthophosphoric acid."
  },
  {
    srNo: 59,
    code: "MP59",
    baseSolvent: "Buffer",
    description: "Dissolve 11.5 gm of Ammonium dihydrogen phosphate in 1000 ml of water (0.01 M Ammonium dihydrogen phosphate)."
  },
  {
    srNo: 60,
    code: "MP60",
    baseSolvent: "Buffer",
    description: "0.005 M tetrabutyl ammonium phosphate solution. Adjust with phosphoric acid to a pH of 2.0."
  },
  {
    srNo: 61,
    code: "MP61",
    baseSolvent: "Buffer",
    description: "0.29% (v/v) of phosphoric acid in water prepared as follows. Transfer an appropriate volume of phosphoric acid to a suitable volumetric flask containing 90% of the final volume of water Adjust with triethylamine to a pH of 5.2, and dilute with water to volume."
  },
  {
    srNo: 62,
    code: "MP62",
    baseSolvent: "Buffer",
    description: "A mixture of 57.5 volumes of methanol and 42.5 volume of 0.02 M sodium octanesulphonate adjusted pH 3.0 with glacial acetic acid."
  },
  {
    srNo: 63,
    code: "MP63",
    baseSolvent: "Buffer",
    description: "Take 3.40 gm of potassium dihydrogen phosphate in 1000 ml of Distilled water and adjust pH 1.8 with phosphoric acid."
  },
  {
    srNo: 64,
    code: "MP64",
    baseSolvent: "Buffer",
    description: "Take 3.25 gm. 1-octanesulphonate sodium monohydrate in 1000 ml distilled water and adjusted pH 2.8 with dilute phosphoric acid."
  },
  {
    srNo: 65,
    code: "MP65",
    baseSolvent: "Buffer",
    description: "Take 1.4664 g of NaH2PO4·2H2O (Monobasic sodium phosphate) and 0.0852 g of Na2HPO4 (Dibasic sodium phosphate) in 2000 ml of Distilled water and adjust pH 6.0 with dilute Sodium hydroxide."
  },
  {
    srNo: 66,
    code: "MP66",
    baseSolvent: "Buffer",
    description: "4.1 gm anhydrous sodium acetate 2.9 ml Glacial acetic acid,5.1 gm tetrabutylammonium hydrogen sulfate 50 ml acetonitrile dilute with buffer and set pH to 5.5 with sodium hydroxide."
  },
  {
    srNo: 67,
    code: "MP67",
    baseSolvent: "Buffer",
    description: "13.800 gm monobasic sodium dihydrogen orthophosphate in water to obtain 1000 ml water."
  },
{
    srNo: 68,
    code: "MP68",
    baseSolvent: "Mobile Phase",
    description: "Water:Acetonitrile:Glacial acetic acid (49 : 50 : 1)."
  },
  {
    srNo: 69,
    code: "MP69",
    baseSolvent: "Mobile Phase",
    description: "SODIUM Phosphate Monobasic 3.12 gm, Sodium Perchlorate 0.56 gm, Adjust pH 2.50 with OPA"
  },
];