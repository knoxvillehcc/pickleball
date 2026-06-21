# -*- coding: utf-8 -*-
{
    'name': 'HCC Pickleball Registration',
    'version': '16.0.1.0.0',
    'category': 'Website',
    'summary': 'Online Pickleball Registration & Payment System for Knoxville HCC',
    'description': """
        Complete Pickleball Registration System for Knoxville Hindu Community Center.
        - Public registration form on HCC website
        - Online payment via existing Stripe account
        - Automated confirmation emails
        - Admin notification emails
        - Backend management dashboard
        - Export to Excel / CSV / PDF
        - Completely independent from Events and Membership modules
    """,
    'author': 'HCC Technology Team',
    'website': 'https://knoxmem.odoo.com',
    'depends': [
        'website',
        'account',
        'payment',
        'mail',
        'base_setup',
    ],
    'data': [
        'security/hcc_pickleball_security.xml',
        'security/ir.model.access.csv',
        'data/hcc_pickleball_data.xml',
        'views/hcc_pickleball_views.xml',
        'views/website_pickleball_templates.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'hcc_pickleball/static/src/css/pickleball.css',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
