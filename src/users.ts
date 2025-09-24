import fs from "fs";
import path from "path";

export interface User {
  email: string;
  password: string;
}

const USERS_FILE = path.join(process.cwd(), "users.json");

export function loadUsers(): User[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf8");
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Error loading users:", error);
    return [];
  }
}

export function saveUsers(users: User[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error saving users:", error);
    throw error;
  }
}

export function createUser(email: string, password: string): User {
  const users = loadUsers();
  
  if (users.find(user => user.email === email)) {
    throw new Error(`User with email ${email} already exists`);
  }
  
  const newUser: User = { email, password };
  users.push(newUser);
  saveUsers(users);
  
  return newUser;
}

export function authenticateUser(email: string, password: string): User | null {
  const users = loadUsers();
  return users.find(user => user.email === email && user.password === password) || null;
}