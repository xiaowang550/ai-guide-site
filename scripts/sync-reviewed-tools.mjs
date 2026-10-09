/** 将已核对的仓库修订合入本地已发布资料；保留版本历史和未发布草稿。 */
import { resolve } from 'node:path'
import { createSqliteDb } from '../lib/db/sqlite.ts'
import { applyToolReview } from '../data/tool-reviews.ts'
import { stripDerivedFields } from '../lib/admin/content.ts'

const db=createSqliteDb({path:resolve('.data/admin-dev.db')})
const rows=await db.all('SELECT i.id,v.data,v.actor FROM content_items i JOIN content_versions v ON v.item_id=i.id AND v.version=i.published_version')
let updated=0,skippedDraft=0
for(const row of rows) {
  if(await db.first('SELECT item_id FROM content_drafts WHERE item_id=?',[row.id])){skippedDraft++;continue}
  const tool=JSON.parse(row.data),reviewed=applyToolReview(row.actor==='local-reviewed-update'?{...tool,updatedAt:'2000-01-01'}:tool)
  if(JSON.stringify(stripDerivedFields(reviewed))===JSON.stringify(stripDerivedFields(tool)))continue
  const next=await db.first('SELECT COALESCE(MAX(version),0)+1 AS version FROM content_versions WHERE item_id=?',[row.id])
  const data=JSON.stringify(stripDerivedFields(reviewed)),now=new Date().toISOString()
  await db.batch([
    {sql:'INSERT INTO content_versions(item_id,version,data,change_note,size_bytes,actor,created_at) VALUES(?,?,?,?,?,?,?)',params:[row.id,next.version,data,'核对当前官方发布，纠正过时功能与计费描述',new TextEncoder().encode(data).length,'local-reviewed-update',now]},
    {sql:'UPDATE content_items SET published_version=?,published_title=?,published_at=?,updated_at=?,edit_version=edit_version+1 WHERE id=?',params:[next.version,reviewed.name,now,now,row.id]},
    {sql:'INSERT INTO audit_log(at,actor,action,target,detail) VALUES(?,?,?,?,?)',params:[now,'local-reviewed-update','reviewed-tool-sync',row.id,JSON.stringify({version:next.version,reviewedAt:reviewed.updatedAt})]},
  ])
  updated++
}
db.close()
console.log(JSON.stringify({updated,skippedDraft,total:rows.length}))
