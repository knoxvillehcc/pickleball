# -*- coding: utf-8 -*-
from odoo import models, fields, api


class HccPickleballConfig(models.TransientModel):
    """Singleton-style config wrapper around ir.config_parameter for pickleball settings."""
    _name = 'hcc.pickleball.config'
    _description = 'Pickleball Event Configuration'

    event_name = fields.Char(
        string='Event Name',
        default='HCC Pickleball Tournament 2026',
    )
    event_date = fields.Date(string='Event Date')
    event_time = fields.Char(
        string='Event Time',
        default='9:00 AM – 5:00 PM',
    )
    event_location = fields.Char(
        string='Event Location',
        default='HCC Sports Complex, Knoxville, TN',
    )
    registration_fee = fields.Float(
        string='Registration Fee ($)',
        default=25.00,
        digits=(10, 2),
    )
    registration_deadline = fields.Date(string='Registration Deadline')
    max_participants = fields.Integer(string='Maximum Participants', default=64)
    admin_email = fields.Char(
        string='Admin Notification Email',
        default='knoxvillehcc@gmail.com',
    )
    registration_open = fields.Boolean(
        string='Registration Open',
        default=True,
    )

    @api.model
    def get_current_config(self):
        """Return the current pickleball event configuration as a dict."""
        get = lambda key, default='': self.env['ir.config_parameter'].sudo().get_param(
            f'hcc_pickleball.{key}', default
        )
        return {
            'event_name': get('event_name', 'HCC Pickleball Tournament 2026'),
            'event_date': get('event_date', ''),
            'event_time': get('event_time', '9:00 AM – 5:00 PM'),
            'event_location': get('event_location', 'HCC Sports Complex, Knoxville, TN'),
            'registration_fee': float(get('registration_fee', '25.00')),
            'registration_deadline': get('registration_deadline', ''),
            'max_participants': int(get('max_participants', '64')),
            'admin_email': get('admin_email', 'knoxvillehcc@gmail.com'),
            'registration_open': get('registration_open', 'True') == 'True',
        }

    def action_save_config(self):
        """Save config values to ir.config_parameter."""
        self.ensure_one()
        set_param = self.env['ir.config_parameter'].sudo().set_param
        set_param('hcc_pickleball.event_name', self.event_name or '')
        set_param('hcc_pickleball.event_date', str(self.event_date) if self.event_date else '')
        set_param('hcc_pickleball.event_time', self.event_time or '')
        set_param('hcc_pickleball.event_location', self.event_location or '')
        set_param('hcc_pickleball.registration_fee', str(self.registration_fee))
        set_param('hcc_pickleball.registration_deadline', str(self.registration_deadline) if self.registration_deadline else '')
        set_param('hcc_pickleball.max_participants', str(self.max_participants))
        set_param('hcc_pickleball.admin_email', self.admin_email or 'knoxvillehcc@gmail.com')
        set_param('hcc_pickleball.registration_open', str(self.registration_open))
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Pickleball Config Saved',
                'message': 'Event configuration has been updated successfully.',
                'type': 'success',
                'sticky': False,
            },
        }
