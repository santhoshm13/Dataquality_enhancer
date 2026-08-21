from app.main import app
print('[1] main import OK')

from app.services.matching.brand_matching import resolve_brand_conflict
r = resolve_brand_conflict('TREX', 'TREX', '--Unbranded--')
tier = r['confidence_tier']
assert tier == 'HIGH', f'Expected HIGH, got {tier}'
assert r['agreement_count'] == 2
print('[2] Brand conflict HIGH (2 agree) OK:', r['matched_value'])

r2 = resolve_brand_conflict('TREX', 'TimberTech', '--No Brand--')
assert r2['conflict'] == True
assert r2['status'] == 'NEEDS_REVIEW'
print('[3] Brand conflict CONFLICT detected OK')

from app.services.audit_trail import generate_audit_report
product = {'id': 1, 'mfg_part_num': 'TST-001', 'enrichment': {}, 'field_provenance': {}, 'attributes': [], 'vision_stage': {'skipped': True}}
report = generate_audit_report(product)
assert 'brand_conflict_resolution' in report
print('[4] Audit trail report generation OK')

from app.database.repository import repository
for i in range(4):
    repository.save_correction(999, 'finish', 'Matte Black', 'mat blk', 'reviewer')
suggs = repository.get_lov_suggestions(threshold=3)
assert any(s['suggested_value'] == 'Matte Black' for s in suggs)
print('[5] Suggestion engine OK:', suggs[0]['suggested_value'], suggs[0]['occurrence_count'], 'occurrences')

from app.api.routes.coverage import router as cov
from app.api.routes.suggestions import router as sug
print('[6] Coverage + Suggestions routes OK')

print('All checks PASSED')
