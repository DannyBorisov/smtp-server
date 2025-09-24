import { createUser } from "./src/users.js";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: npm run create-user <email> <password>");
  process.exit(1);
}

try {
  const user = createUser(email, password);
  console.log(`Successfully created user: ${user.email}`);
} catch (error) {
  console.error("Error creating user:", (error as Error).message);
  process.exit(1);
}