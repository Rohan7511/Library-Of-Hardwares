import pool from "../config/db.js";

export const viewPending = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM request WHERE status='pending' ORDER BY id DESC"
    );

    // Fetch items for each request
    for (let reqRow of rows) {
      const { rows: items } = await pool.query(
        `SELECT p.id as product_id, p.name, p.available_quantity, ri.requested_qty 
         FROM request_items ri
         JOIN product p ON ri.product_id = p.id
         WHERE ri.request_id = $1`,
        [reqRow.id]
      );
      reqRow.items = items;
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const approveRequest = async (req, res) => {
  const { request_id, location, approved_items } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify quantity logic if approved_items is supplied.
    if (approved_items && Array.isArray(approved_items)) {
      for (const item of approved_items) {
        const { rows } = await client.query(
          "SELECT available_quantity FROM product WHERE id=$1",
          [item.product_id]
        );
        if (rows.length === 0) throw new Error(`Product ${item.product_id} not found`);
        if (item.approved_qty > rows[0].available_quantity) {
          throw new Error(`Cannot approve ${item.approved_qty} units of Product ${item.product_id}. Only ${rows[0].available_quantity} available.`);
        }
      }
    }

    await client.query(
      `UPDATE request 
       SET status='approved',
           approved_by=$1,
           collection_location=$2,
           collection_time=CURRENT_TIMESTAMP
       WHERE id=$3`,
      [req.user.id, location, request_id]
    );

    if (approved_items && Array.isArray(approved_items)) {
      for (const item of approved_items) {
        if (item.approved_qty > 0) {
          await client.query(
            `UPDATE request_items SET requested_qty=$1 WHERE request_id=$2 AND product_id=$3`,
            [item.approved_qty, request_id, item.product_id]
          );
          await client.query(
            `UPDATE product SET available_quantity = available_quantity - $1 WHERE id=$2`,
            [item.approved_qty, item.product_id]
          );
        } else {
          await client.query(
            `DELETE FROM request_items WHERE request_id=$1 AND product_id=$2`,
            [request_id, item.product_id]
          );
        }
      }
    } else {
      // Fallback for older code without approved_items (if any)
      await client.query(
        `UPDATE product p
         SET available_quantity = p.available_quantity - ri.requested_qty
         FROM request_items ri
         WHERE p.id = ri.product_id
         AND ri.request_id = $1`,
        [request_id]
      );
    }

    await client.query("COMMIT");

    res.json({ message: "Approved" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const acceptReturn = async (req, res) => {
  const { request_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE request SET status='returned' WHERE id=$1",
      [request_id]
    );

    await client.query(
      `UPDATE product p
       SET available_quantity = p.available_quantity + ri.requested_qty
       FROM request_items ri
       WHERE p.id = ri.product_id
       AND ri.request_id = $1`,
      [request_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Return accepted" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};