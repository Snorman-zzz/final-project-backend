import { query } from '../database/connection.js';
import bcrypt from 'bcryptjs';

export class User {
  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create({ email, password, name, role = 'user' }) {
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    const result = await query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, created_at
    `, [email, passwordHash, name, role]);
    
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    const result = await query(`
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, name, role
    `, [passwordHash, userId]);
    
    return result.rows[0];
  }

  static async update(userId, { email, name }) {
    const result = await query(`
      UPDATE users 
      SET email = COALESCE($1, email), 
          name = COALESCE($2, name),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, name, role, updated_at
    `, [email, name, userId]);
    
    return result.rows[0];
  }

  static async getAllUsers(limit = 50, offset = 0) {
    const result = await query(`
      SELECT id, email, name, role, created_at 
      FROM users 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return result.rows;
  }

  static async getUserCount() {
    const result = await query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  }
}