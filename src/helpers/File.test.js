import cases from "jest-in-case";

cases(
  "add(augend, addend)",
  opts => {
    expect(add(opts.augend, opts.addend)).toBe(opts.total);
  },
  [
    { name: "1 + 1 = 2", augend: 1, addend: 1, total: 2 },
    { name: "2 + 1 = 3", augend: 2, addend: 1, total: 3 },
    { name: "3 + 1 = 4", augend: 3, addend: 1, total: 4 }
  ]
);
