select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'finetune_students'
order by grantee, privilege_type;