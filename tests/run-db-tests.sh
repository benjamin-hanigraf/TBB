#!/bin/bash
# Runs the database security tests on a throw-away local Postgres (needs postgres installed). Usage: bash tests/run-db-tests.sh
set -e; DIR=$(cd "$(dirname "$0")/.." && pwd); PG=/usr/lib/postgresql/16/bin; T=/tmp/pgtest
run() { su postgres -c "psql -h $T -p 54329 -d tbb -v ON_ERROR_STOP=1 -q -f $1"; }
su postgres -c "psql -h $T -p 54329 -q -c 'drop database if exists tbb' -c 'create database tbb'" >/dev/null 2>&1
for f in $DIR/tests/bootstrap.sql $DIR/supabase/schema.sql $DIR/supabase/seed.sql $DIR/supabase/v2.sql $DIR/supabase/v3.sql $DIR/supabase/v4.sql $DIR/supabase/v5.sql; do run $f 2>&1 | grep -v NOTICE || true; done
su postgres -c "psql -h $T -p 54329 -d tbb -f $DIR/tests/rls.test.sql" 2>&1 | grep -E "ERROR|PASSED|CONTEXT" || true
