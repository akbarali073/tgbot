// 👧 10 ta Qizlar ro'yxati (Erkak foydalanuvchilar uchun)
export const femalePartners = [
  { name: "Sevinch", age: 21 },
  { name: "Madina", age: 20 },
  { name: "Laylo", age: 22 },
  { name: "Diyora", age: 19 },
  { name: "Rayhon", age: 23 },
  { name: "Zohida", age: 21 },
  { name: "Shahzoda", age: 20 },
  { name: "Aziza", age: 22 },
  { name: "Jasmina", age: 19 },
  { name: "Sabina", age: 21 },
];

// 👦 10 ta Yigitlar ro'yxati (Qiz foydalanuvchilar uchun)
export const malePartners = [
  { name: "Jasur", age: 24 },
  { name: "Sardor", age: 23 },
  { name: "Bekzod", age: 25 },
  { name: "Javohir", age: 22 },
  { name: "Diyorbek", age: 24 },
  { name: "Farrux", age: 26 },
  { name: "Otabek", age: 23 },
  { name: "Shohruh", age: 25 },
  { name: "Bobur", age: 22 },
  { name: "Eldor", age: 24 },
];

export function getRandomPartner(gender) {
  const list = gender === "male" ? femalePartners : malePartners;
  return list[Math.floor(Math.random() * list.length)];
}
