--
-- ⛽ ALCHEMY WEBHOOK SCHEMA — Gas Credits Tracking
-- 
-- Arquiteto: Júnior Sena — Sovereign AI Architect
-- Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
--

-- Tabela de log de webhooks da Alchemy
CREATE TABLE IF NOT EXISTS alchemy_webhook_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    signature TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_alchemy_event_type ON alchemy_webhook_log(event_type);
CREATE INDEX IF NOT EXISTS idx_alchemy_received_at ON alchemy_webhook_log(received_at);
CREATE INDEX IF NOT EXISTS idx_alchemy_processed ON alchemy_webhook_log(processed);

-- Tabela de notificações do sistema
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notificações
CREATE INDEX IF NOT EXISTS idx_notifications_type ON system_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON system_notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON system_notifications(created_at);

-- View para status de créditos
CREATE OR REPLACE VIEW alchemy_credits_status AS
WITH 
approvals AS (
    SELECT 
        event_data->'data'->>'credit_amount' as amount,
        event_data->'data'->>'currency' as currency,
        received_at,
        ROW_NUMBER() OVER (ORDER BY received_at DESC) as rn
    FROM alchemy_webhook_log
    WHERE event_type = 'credit_approved'
),
consumptions AS (
    SELECT 
        COALESCE(SUM((event_data->'data'->>'amount')::numeric), 0) as total_consumed
    FROM alchemy_webhook_log
    WHERE event_type = 'credit_consumed'
)
SELECT 
    a.amount::numeric as approved_amount,
    a.currency,
    c.total_consumed,
    (a.amount::numeric - c.total_consumed) as remaining,
    a.received_at as last_approval,
    CASE 
        WHEN (a.amount::numeric - c.total_consumed) > 0 THEN 'ACTIVE'
        ELSE 'DEPLETED'
    END as status
FROM approvals a
CROSS JOIN consumptions c
WHERE a.rn = 1;

-- Função para processar evento de webhook
CREATE OR REPLACE FUNCTION process_alchemy_webhook(
    p_event_type TEXT,
    p_event_data JSONB
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Inserir log
    INSERT INTO alchemy_webhook_log (event_type, event_data)
    VALUES (p_event_type, p_event_data)
    RETURNING id INTO v_log_id;
    
    -- Criar notificação para eventos importantes
    IF p_event_type = 'credit_approved' THEN
        INSERT INTO system_notifications (type, title, message, severity, data)
        VALUES (
            'alchemy_credit_approved',
            'Gas Credits Approved',
            format('%s %s approved for deployment', 
                p_event_data->>'credit_amount', 
                p_event_data->>'currency'),
            'info',
            p_event_data
        );
    ELSIF p_event_type = 'threshold_alert' THEN
        INSERT INTO system_notifications (type, title, message, severity, data)
        VALUES (
            'alchemy_credit_low',
            'Gas Credits Running Low',
            format('Only %s credits remaining', 
                p_event_data->>'remaining_credits'),
            'warning',
            p_event_data
        );
    END IF;
    
    -- Marcar como processado
    UPDATE alchemy_webhook_log 
    SET processed = TRUE, 
        processed_at = NOW(),
        processing_result = jsonb_build_object('notification_created', true)
    WHERE id = v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE alchemy_webhook_log IS '⛽ Alchemy Gas Credits webhook events';
COMMENT ON TABLE system_notifications IS '📊 System notifications for critical events';
COMMENT ON VIEW alchemy_credits_status IS '💰 Real-time view of Alchemy credits balance';

-- Trigger para notificações automáticas (opcional)
CREATE OR REPLACE FUNCTION notify_on_low_credits()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'threshold_alert' AND 
       (NEW.event_data->>'threshold_percent')::numeric < 20 THEN
        -- Aqui poderia integrar com webhook externo (Discord, Slack, etc.)
        PERFORM pg_notify('low_credits_alert', 
            jsonb_build_object(
                'remaining', NEW.event_data->>'remaining_credits',
                'threshold', NEW.event_data->>'threshold_percent'
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_low_credits_alert ON alchemy_webhook_log;
CREATE TRIGGER tr_low_credits_alert
    AFTER INSERT ON alchemy_webhook_log
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_low_credits();

-- Políticas RLS
ALTER TABLE alchemy_webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY alchemy_webhook_select ON alchemy_webhook_log FOR SELECT USING (true);
CREATE POLICY alchemy_webhook_insert ON alchemy_webhook_log FOR INSERT WITH CHECK (true);

CREATE POLICY notifications_select ON system_notifications FOR SELECT USING (true);
CREATE POLICY notifications_insert ON system_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_update ON system_notifications FOR UPDATE USING (true);
