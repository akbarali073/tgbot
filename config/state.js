// Centralized state maps to share cleanly between handlers and services

export const userState = new Map();         // User bosqichlari (awaiting_name, awaiting_age, awaiting_city, searching_partner, real_chatting, ai_chatting)
export const tempUserData = new Map();      // Vaqtinchalik foydalanuvchi ma'lumotlari (ism, yosh, sub_clicks, vip_setting_mode)
export const activePartner = new Map();     // Userning biriktirilgan AI sherigi
export const adminState = new Map();        // Admin bosqichlari (add_channel, send_message, await_broadcast_button, add_linkpic)
export const tempData = new Map();          // Admin vaqtinchalik ma'lumotlari
export const adminBroadcastData = new Map(); // Admin rasmli/matnli xabar va button ma'lumotlari
export const navbarIndex = new Map();       // Video almashtirish indeksi
