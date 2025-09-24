import os
import unittest
from datetime import date, timedelta

os.environ['TENDER_PORTAL_DB'] = ':memory:'

from tender_portal import auth, database, models  # noqa: E402


class TenderPortalTestCase(unittest.TestCase):
    def setUp(self):
        database.reset_database()
        database.init_db()
        auth.ensure_default_users()

    def test_user_authentication(self):
        user = auth.authenticate('admin', 'Admin123!')
        self.assertIsNotNone(user)
        self.assertEqual(user['role'], 'admin')

        new_user_id = auth.create_user('finance_test', 'Finance123!', 'finance')
        self.assertIsInstance(new_user_id, int)
        new_user = auth.authenticate('finance_test', 'Finance123!')
        self.assertIsNotNone(new_user)
        self.assertEqual(new_user['role'], 'finance')

    def test_tender_project_flow(self):
        procurement = auth.authenticate('procurement', 'Procure123!')
        self.assertIsNotNone(procurement)
        tender_id = models.create_tender(
            {
                'reference_code': 'RFQ-001',
                'title_en': 'Office supplies',
                'title_ar': 'مستلزمات مكتبية',
                'tender_type': 'RFQ',
                'status': 'draft',
                'submission_deadline': date.today().isoformat(),
            },
            user=procurement,
        )
        self.assertIsInstance(tender_id, int)
        tender = models.get_tender(tender_id)
        self.assertEqual(tender['title_en'], 'Office supplies')

        # Promote tender to awarded
        models.update_tender(tender_id, {'status': 'awarded'}, user=procurement)
        tender = models.get_tender(tender_id)
        self.assertEqual(tender['status'], 'awarded')

        finance = auth.authenticate('finance', 'Finance123!')
        self.assertIsNotNone(finance)
        project_id = models.create_project(
            {
                'tender_id': tender_id,
                'name_en': 'Office fit-out',
                'status': 'planning',
                'currency': 'USD',
                'contract_value': 10000,
                'amount_received': 2000,
                'amount_invoiced': 5000,
                'profit_local': 6000,
            },
            user=finance,
        )
        self.assertIsInstance(project_id, int)
        project = models.get_project(project_id)
        self.assertEqual(project['tender_id'], tender_id)

        models.update_project(project_id, {'payment_status': 'delayed'}, user=finance)
        project = models.get_project(project_id)
        self.assertEqual(project['payment_status'], 'delayed')

        invoice_id = models.add_invoice(
            project_id,
            {
                'amount': 3000,
                'currency': 'USD',
                'due_date': (date.today() - timedelta(days=1)).isoformat(),
                'status': 'unpaid',
            },
            user=finance,
        )
        self.assertIsInstance(invoice_id, int)
        invoices = models.list_invoices(project_id)
        self.assertEqual(len(invoices), 1)

        summary = models.financial_pipeline()
        self.assertGreaterEqual(summary['outstanding_invoices'], 3000)

    def test_notifications(self):
        procurement = auth.authenticate('procurement', 'Procure123!')
        tender_id = models.create_tender(
            {
                'reference_code': 'ITB-100',
                'title_en': 'Logistics support',
                'title_ar': 'دعم لوجستي',
                'tender_type': 'ITB',
                'status': 'submitted',
                'submission_deadline': (date.today() + timedelta(days=3)).isoformat(),
            },
            user=procurement,
        )
        finance = auth.authenticate('finance', 'Finance123!')
        project_id = models.create_project(
            {
                'tender_id': tender_id,
                'name_en': 'Logistics project',
                'status': 'executing',
                'payment_status': 'unpaid',
                'guarantee_end': (date.today() + timedelta(days=7)).isoformat(),
            },
            user=finance,
        )
        models.add_invoice(
            project_id,
            {
                'amount': 1000,
                'currency': 'USD',
                'due_date': (date.today() - timedelta(days=2)).isoformat(),
                'status': 'unpaid',
            },
            user=finance,
        )
        models.generate_notifications()
        procurement_notifications = models.list_notifications('procurement')
        finance_notifications = models.list_notifications('finance')
        manager_notifications = models.list_notifications('project_manager')
        self.assertTrue(any('Tender closing' in note['title_en'] for note in procurement_notifications))
        self.assertTrue(any('Invoice overdue' in note['title_en'] for note in finance_notifications))
        self.assertTrue(any('Guarantee expiring' in note['title_en'] for note in manager_notifications))


if __name__ == '__main__':
    unittest.main()
