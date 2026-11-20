// Invented data only (no workspace data): a small world in two languages.
export const entities = [
  { id: "user", kind: "person", name: "Mira", aliases: [] },
  { id: "p1", kind: "person", name: "Ada", aliases: [] },
  { id: "p2", kind: "person", name: "Bram", aliases: [] },
  { id: "p3", kind: "person", name: "Cora", aliases: [] },
  { id: "p4", kind: "person", name: "Dmytro", aliases: [] },
  { id: "p5", kind: "person", name: "Elena", aliases: [] },
  { id: "o1", kind: "thing", name: "the guild ledger", aliases: [] },
  { id: "l1", kind: "place", name: "the mill", aliases: [] },
  { id: "l2", kind: "place", name: "the harbour", aliases: [] },
  { id: "l3", kind: "place", name: "the chapel", aliases: [] },
];
export const present = ["Cora", "Mira"];
export const fronts = ["f1", "f2"];
const en = {
  k: 3, span: 9 * 60,
  scene: { place: "the mill", present },
  fronts: [{ id: "f1", name: "The Guild of Ravens", goal: "take control of the harbour", clock: 3, size: 6 }, { id: "f2", name: "The magistrate", goal: "find who stole the ledger", clock: 1, size: 4 }],
  npcs: [{ id: "p2", name: "Bram", goal: "repay a debt to the Guild", where: "the harbour" }, { id: "p4", name: "Dmytro", goal: "keep his smuggling quiet", where: "the harbour" }],
  absent: [{ id: "p1", name: "Ada", goal: "hide the ledger she stole", where: "the chapel" }, { id: "p5", name: "Elena", goal: "protect her brother Bram", where: "the harbour" }],
  places: [{ id: "l1", name: "the mill" }, { id: "l2", name: "the harbour" }, { id: "l3", name: "the chapel" }],
  recent: [],
};
const uk = {
  ...en,
  fronts: [{ id: "f1", name: "Гільдія Круків", goal: "захопити порт", clock: 3, size: 6 }, { id: "f2", name: "Магістрат", goal: "знайти того, хто вкрав книгу обліку", clock: 1, size: 4 }],
  npcs: [{ id: "p2", name: "Брам", goal: "віддати борг Гільдії", where: "порт" }, { id: "p4", name: "Дмитро", goal: "не розголошувати свою контрабанду", where: "порт" }],
  absent: [{ id: "p1", name: "Ада", goal: "сховати вкрадену книгу", where: "каплиця" }, { id: "p5", name: "Олена", goal: "захистити брата Брама", where: "порт" }],
  places: [{ id: "l1", name: "млин" }, { id: "l2", name: "порт" }, { id: "l3", name: "каплиця" }],
  scene: { place: "млин", present: ["Кора", "Міра"] },
};
export const inputs = { en, uk };
