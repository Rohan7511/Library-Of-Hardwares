import pkg from "pg";
const {Pool} = pkg;
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "hardware_library",
    password: "welcome123",
    port: 5432,
});

export default pool;
