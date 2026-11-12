#!/bin/bash
# Runs the database security tests on a throw-away local Postgres (needs postgres installed). Usage: bash tests/run-db-tests.sh
set -e; DIR=$(cd "$(dirname "$0")/.." && pwd); PG=/usr/lib/postgresql/16/bin; T=/tmp/pgtest
run() { su postgres -c "psql -h $T -p 54329 -d tbb -v ON_ERROR_STOP=1 -q -f $1"; }
su postgres -c "psql -h $T -p 54329 -q -c 'drop database if exists tbb' -c 'create database tbb'" >/dev/null 2>&1
for f in $DIR/tests/bootstrap.sql $DIR/supabase/database.sql $DIR/supabase/database.sql; do run $f 2>&1 | grep -v NOTICE || true; done   # the one database file, run twice: it must be safe to repeat
su postgres -c "psql -h $T -p 54329 -d tbb -f $DIR/tests/rls.test.sql" 2>&1 | grep -E "ERROR|PASSED|CONTEXT" || true
# The dummy test data must load on top of the latest database, and the removal script must take all of it out again.
cp $DIR/supabase/dummy.sql $DIR/supabase/dummy-remove.sql $T/ && chmod a+r $T/dummy.sql $T/dummy-remove.sql
if run $T/dummy.sql >/dev/null 2>&1 && su postgres -c "psql -h $T -p 54329 -d tbb -At -f $T/dummy-remove.sql" 2>/dev/null | grep -qx 'dummy rows left|0'; then echo "DUMMY DATA LOADS AND REMOVES CLEANLY"; else echo "ERROR: dummy data failed to load or remove"; fi
