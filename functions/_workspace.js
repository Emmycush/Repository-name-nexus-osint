import { json } from './_utils.js';

export async function getWorkspaceForUser(db, userId){
  return db.prepare(`
    SELECT w.id,w.name,w.slug,wm.role
    FROM workspace_members wm
    JOIN workspaces w ON w.id=wm.workspace_id
    WHERE wm.user_id=? AND wm.status='active'
    ORDER BY w.created_at LIMIT 1
  `).bind(userId).first();
}

export async function getCaseAccess(db, userId, caseId){
  return db.prepare(`
    SELECT c.id,c.title,c.status,c.target,c.notes,c.created_at,c.updated_at,c.user_id,
           wm.role AS member_role,
           CASE WHEN c.user_id=? THEN 1 ELSE 0 END AS is_owner
    FROM cases c
    LEFT JOIN workspace_members wm ON wm.user_id=? AND wm.status='active'
      AND wm.workspace_id=(
        SELECT wm2.workspace_id FROM workspace_members wm2
        WHERE wm2.user_id=c.user_id AND wm2.status='active'
        ORDER BY wm2.joined_at LIMIT 1
      )
    WHERE c.id=? AND (
      c.user_id=? OR EXISTS(
        SELECT 1 FROM workspace_members wm3
        JOIN workspace_members owner_wm ON owner_wm.workspace_id=wm3.workspace_id
        WHERE wm3.user_id=? AND wm3.status='active'
          AND owner_wm.user_id=c.user_id AND owner_wm.status='active'
      )
    )
    LIMIT 1
  `).bind(userId,userId,caseId,userId,userId).first();
}

export function canReadCase(access){ return !!access; }
export function canWriteCase(access){ return !!access && (access.is_owner===1 || ['owner','admin','analyst','member'].includes(access.member_role)); }
export function canManageCase(access){ return !!access && (access.is_owner===1 || ['owner','admin'].includes(access.member_role)); }
export function deny(message='Permission denied'){ return json({error:message},403); }
