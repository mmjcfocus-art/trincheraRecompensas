// ============================================
// CONFIGURACIÓN DE FIREBASE Y CONSTANTES
// ============================================

export const firebaseConfig = {
    apiKey: "AIzaSyCmTUQa8MSDQPJ3Uz8PH1BKgOB3oM-WaX0",
    authDomain: "latrincheraloyalty.firebaseapp.com",
    databaseURL: "https://latrincheraloyalty-default-rtdb.firebaseio.com",
    projectId: "latrincheraloyalty",
    storageBucket: "latrincheraloyalty.firebasestorage.app",
    messagingSenderId: "387143959227",
    appId: "1:387143959227:web:5a6444e019c7b6fcbb9f9e"
};

export const MAX_STAMPS = 5;
export const MAX_REWARD_HOURS = 10;
export const MIN_PASSWORD_LENGTH = 3;

export const SEED_USERS = [
    { id: "1", nombre: "Joan", correo: "joan@gmail.com", telefono: "7351813882", contrasena: "123", sellos: 3, horas_gratis: 0, avatar: "helmet" },
    { id: "2", nombre: "Marcus Fenix", correo: "marcus@gears.com", telefono: "555-0101", contrasena: "123", sellos: 4, horas_gratis: 1, avatar: "cyborg" },
    { id: "3", nombre: "Master Chief", correo: "john117@unsc.gov", telefono: "555-1170", contrasena: "123", sellos: 0, horas_gratis: 2, avatar: "ninja" }
];