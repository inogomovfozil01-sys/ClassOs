import sqlite3
source = sqlite3.connect('file:prisma/dev.db?mode=ro', uri=True)
destination = sqlite3.connect('prisma/qa.db')
statements = source.execute("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'").fetchall()
destination.executescript(';'.join(row[0] for row in statements))
destination.close()
print('Isolated schema ready')
