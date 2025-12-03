const db = require('../db');

function buildFilterQuery({ q, mood, tags, date_from, date_to, sortBy, order, page, pageSize, userId }) {
  const where = ['user_id = ?']; // restrict to user
  const params = [userId];

  if (q) {
    // full-text match (use IN BOOLEAN MODE for partial + wildcard)
    where.push('MATCH(title, body) AGAINST(? IN BOOLEAN MODE)');
    // convert q into boolean mode terms: add * for prefix matching
    const booleanQ = q.split(/\s+/).map(tok => `${tok.trim()}*`).join(' ');
    params.push(booleanQ);
  }

  if (mood) {
    where.push('mood_label = ?');
    params.push(mood);
  }

  if (tags) {
    // tags may be provided as comma-separated or array; prefer entry_tags table
    // we'll support JSON tags fallback too
    if (Array.isArray(tags)) {
      // match entries that have all tags: join required in SQL layer (handled in route)
    } else {
      // single tag
      where.push('(EXISTS (SELECT 1 FROM entry_tags et WHERE et.entry_id = entries.id AND et.tag = ?))');
      params.push(tags);
    }
  }

  if (date_from) {
    where.push('DATE(created_at) >= ?');
    params.push(date_from);
  }
  if (date_to) {
    where.push('DATE(created_at) <= ?');
    params.push(date_to);
  }

  const sortColumn = (sortBy === 'mood_score') ? 'mood_score' : 'created_at';
  const sortOrder = (order && order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

  const p = Number(page || 1);
  const ps = Math.min(Number(pageSize || 20), 200);
  const offset = (p - 1) * ps;

  return {
    whereClause: where.length ? ('WHERE ' + where.join(' AND ')) : '',
    params,
    orderClause: `ORDER BY ${sortColumn} ${sortOrder}`,
    limitClause: `LIMIT ? OFFSET ?`,
    limitParams: [ps, offset]
  };
}

async function searchEntries(req, res) {
  try {
    const userId = req.user.id;
    const {
      q, mood, tags, date_from, date_to, sortBy, order, page, pageSize
    } = req.query;

    // Build filter
    const { whereClause, params, orderClause, limitClause, limitParams } = buildFilterQuery({
      q, mood, tags, date_from, date_to, sortBy, order, page, pageSize, userId
    });

    // If tags supplied as array and you want AND match, do joins — simple path for now: use entry_tags INNER JOIN
    let baseSql = `SELECT entries.* FROM entries `;
    const extraJoins = [];
    let finalWhere = whereClause;
    const finalParams = params.slice();

    if (Array.isArray(tags) && tags.length) {
      // For AND matching of tags, join entry_tags once per tag (small number expected)
      let i = 0;
      for (const t of tags) {
        const alias = `et${i}`;
        extraJoins.push(`INNER JOIN entry_tags ${alias} ON ${alias}.entry_id = entries.id AND ${alias}.tag = ?`);
        finalParams.push(t);
        i++;
      }
    }

    const sql = `${baseSql} ${extraJoins.join(' ')} ${finalWhere} ${orderClause} ${limitClause}`;
    const allParams = finalParams.concat(limitParams);

    const [rows] = await db.query(sql, allParams);

    const countSql = `SELECT COUNT(DISTINCT entries.id) as total FROM entries ${extraJoins.join(' ')} ${finalWhere}`;
    const [countRows] = await db.query(countSql, finalParams);
    const total = countRows[0] ? Number(countRows[0].total) : rows.length;

    res.json({ data: rows, meta: { total, page: Number(page || 1), pageSize: Number(pageSize || 20) } });
  } catch (err) {
    console.error('searchEntries error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { searchEntries };
